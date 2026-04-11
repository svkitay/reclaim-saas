from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, BackgroundTasks, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import List, Optional
import csv
import io
import os

from database import get_db, engine, Base
import models
import schemas
import auth
import campaign_engine
import ai_generator
import message_sender

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Reclaim API", version="2.0.0")

# Allow all origins in dev; in production set ALLOWED_ORIGINS env var
_origins_env = os.getenv("ALLOWED_ORIGINS", "*")
_allowed_origins = [o.strip() for o in _origins_env.split(",")] if _origins_env != "*" else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def create_super_admin(db: Session):
    """Create the default super admin account on startup."""
    admin_email = os.getenv("ADMIN_EMAIL", "admin@reclaim.furniture")
    admin_password = os.getenv("ADMIN_PASSWORD", "reclaim-admin-2024")
    existing = db.query(models.Retailer).filter(models.Retailer.email == admin_email).first()
    if not existing:
        admin = models.Retailer(
            store_name="Reclaim HQ",
            email=admin_email,
            hashed_password=auth.hash_password(admin_password),
            role=models.UserRole.SUPER_ADMIN,
            sender_name="Reclaim Platform",
        )
        db.add(admin)
        db.commit()
        print(f"Super admin created: {admin_email}")


@app.on_event("startup")
def startup_event():
    db = next(get_db())
    create_super_admin(db)
    print("Reclaim API v2 started. Database initialized.")


@app.get("/api/health")
def health():
    return {"status": "ok", "version": "2.0.0"}


# ─── AUTH ─────────────────────────────────────────────────────────────────────

@app.post("/api/auth/signup", response_model=schemas.TokenResponse)
def signup(data: schemas.RetailerSignup, db: Session = Depends(get_db)):
    existing = db.query(models.Retailer).filter(models.Retailer.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    retailer = models.Retailer(
        store_name=data.store_name,
        email=data.email,
        hashed_password=auth.hash_password(data.password),
        role=models.UserRole.RETAILER,
        sender_name=data.store_name,
    )
    db.add(retailer)
    db.commit()
    db.refresh(retailer)

    token = auth.create_access_token({"sub": str(retailer.id)})
    return schemas.TokenResponse(
        access_token=token,
        retailer_id=retailer.id,
        store_name=retailer.store_name,
        role=retailer.role,
    )


@app.post("/api/auth/login", response_model=schemas.TokenResponse)
def login(data: schemas.RetailerLogin, db: Session = Depends(get_db)):
    retailer = db.query(models.Retailer).filter(models.Retailer.email == data.email).first()
    if not retailer or not auth.verify_password(data.password, retailer.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not retailer.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")

    token = auth.create_access_token({"sub": str(retailer.id)})
    return schemas.TokenResponse(
        access_token=token,
        retailer_id=retailer.id,
        store_name=retailer.store_name,
        role=retailer.role,
    )


@app.get("/api/auth/me", response_model=schemas.RetailerProfile)
def get_me(current: models.Retailer = Depends(auth.get_current_retailer), db: Session = Depends(get_db)):
    customer_count = db.query(models.Customer).filter(models.Customer.retailer_id == current.id).count()
    emails_sent = db.query(models.CampaignLog).filter(
        models.CampaignLog.retailer_id == current.id,
        models.CampaignLog.channel == "email",
        models.CampaignLog.status.in_(["sent", "demo"]),
    ).count()
    return schemas.RetailerProfile(
        id=current.id,
        store_name=current.store_name,
        email=current.email,
        role=current.role,
        sender_name=current.sender_name,
        sender_email=current.sender_email,
        sender_email_verified=bool(current.sender_email_verified),
        store_website=current.store_website,
        store_phone=current.store_phone,
        has_brevo=bool(current.brevo_api_key),
        has_twilio=bool(current.twilio_account_sid),
        has_anthropic=bool(current.anthropic_api_key),
        created_at=current.created_at,
        customer_count=customer_count,
        emails_sent=emails_sent,
    )


# ─── RETAILER SETTINGS ────────────────────────────────────────────────────────

@app.put("/api/settings", response_model=schemas.RetailerProfile)
def update_settings(
    data: schemas.RetailerSettings,
    current: models.Retailer = Depends(auth.get_current_retailer),
    db: Session = Depends(get_db),
):
    old_sender_email = current.sender_email
    update_data = data.dict(exclude_none=True)
    # If sender_email is changing, reset verification and trigger Brevo verification
    new_sender_email = update_data.get("sender_email")
    if new_sender_email and new_sender_email != old_sender_email:
        update_data["sender_email_verified"] = False
        # Trigger Brevo sender verification using platform API key
        _trigger_brevo_sender_verification(
            email=new_sender_email,
            name=update_data.get("sender_name") or current.sender_name or current.store_name,
        )
    for field, value in update_data.items():
        setattr(current, field, value)
    db.commit()
    db.refresh(current)
    return get_me(current, db)


def _trigger_brevo_sender_verification(email: str, name: str) -> None:
    """Add email as a sender in the platform Brevo account and trigger verification email."""
    import requests as _req
    api_key = os.getenv("BREVO_API_KEY", "")
    if not api_key:
        print("No platform BREVO_API_KEY set — skipping sender verification")
        return
    # First check if sender already exists
    try:
        resp = _req.get(
            "https://api.brevo.com/v3/senders",
            headers={"api-key": api_key, "accept": "application/json"},
            timeout=10,
        )
        if resp.status_code == 200:
            existing = [s["email"] for s in resp.json().get("senders", [])]
            if email in existing:
                print(f"Sender {email} already exists in Brevo")
                return
    except Exception as e:
        print(f"Error checking Brevo senders: {e}")
    # Create sender — Brevo will send a verification email automatically
    try:
        resp = _req.post(
            "https://api.brevo.com/v3/senders",
            headers={
                "api-key": api_key,
                "accept": "application/json",
                "content-type": "application/json",
            },
            json={"name": name, "email": email},
            timeout=10,
        )
        if resp.status_code in (200, 201):
            print(f"Brevo sender verification email sent to {email}")
        else:
            print(f"Brevo sender creation error {resp.status_code}: {resp.text}")
    except Exception as e:
        print(f"Error creating Brevo sender: {e}")


# ─── SENDER VERIFICATION ────────────────────────────────────────────────────────

@app.post("/api/settings/verify-sender")
def resend_sender_verification(
    current: models.Retailer = Depends(auth.get_current_retailer),
    db: Session = Depends(get_db),
):
    """Resend the Brevo sender verification email for the retailer's current sender_email."""
    if not current.sender_email:
        raise HTTPException(status_code=400, detail="No sender email configured")
    _trigger_brevo_sender_verification(
        email=current.sender_email,
        name=current.sender_name or current.store_name,
    )
    return {"message": f"Verification email sent to {current.sender_email}"}


@app.post("/api/webhooks/brevo-sender-verified")
def brevo_sender_verified_webhook(
    payload: dict,
    db: Session = Depends(get_db),
):
    """
    Called by Brevo when a sender email is verified.
    Finds the retailer with that sender_email and marks it as verified.
    Note: Brevo does not natively support webhooks for sender verification,
    so this endpoint can also be called manually or via a polling job.
    """
    email = payload.get("email", "")
    if not email:
        return {"message": "No email in payload"}
    retailer = db.query(models.Retailer).filter(
        models.Retailer.sender_email == email
    ).first()
    if retailer:
        retailer.sender_email_verified = True
        db.commit()
        return {"message": f"Sender {email} marked as verified"}
    return {"message": f"No retailer found with sender_email {email}"}


@app.post("/api/settings/confirm-sender-verified")
def confirm_sender_verified(
    current: models.Retailer = Depends(auth.get_current_retailer),
    db: Session = Depends(get_db),
):
    """
    Called by the frontend after the retailer confirms they clicked the Brevo verification link.
    Checks Brevo to confirm the sender is actually active, then marks it verified.
    """
    if not current.sender_email:
        raise HTTPException(status_code=400, detail="No sender email configured")
    import requests as _req
    api_key = os.getenv("BREVO_API_KEY", "")
    if not api_key:
        raise HTTPException(status_code=500, detail="Platform Brevo API key not configured")
    try:
        resp = _req.get(
            "https://api.brevo.com/v3/senders",
            headers={"api-key": api_key, "accept": "application/json"},
            timeout=10,
        )
        if resp.status_code == 200:
            senders = resp.json().get("senders", [])
            for s in senders:
                if s["email"] == current.sender_email and s.get("active"):
                    current.sender_email_verified = True
                    db.commit()
                    db.refresh(current)
                    return {"verified": True, "message": f"{current.sender_email} is verified and active"}
            return {"verified": False, "message": "Sender not yet verified in Brevo — please click the verification link in your email"}
        else:
            raise HTTPException(status_code=500, detail="Could not check Brevo sender status")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── CUSTOMERS ────────────────────────────────────────────────────────────────

def enrich_customer(customer: models.Customer) -> schemas.CustomerResponse:
    next_tp = campaign_engine.get_next_touchpoint_info(customer)
    return schemas.CustomerResponse(
        id=customer.id,
        retailer_id=customer.retailer_id,
        name=customer.name,
        email=customer.email,
        phone=customer.phone,
        item_purchased=customer.item_purchased,
        purchase_date=customer.purchase_date,
        purchase_amount=customer.purchase_amount,
        campaign_status=customer.campaign_status,
        current_touchpoint=customer.current_touchpoint,
        last_contacted=customer.last_contacted,
        created_at=customer.created_at,
        next_touchpoint_name=next_tp.get("name"),
        days_until_next=next_tp.get("days_until"),
        next_is_overdue=next_tp.get("overdue", False),
    )


@app.get("/api/customers", response_model=List[schemas.CustomerResponse])
def list_customers(
    current: models.Retailer = Depends(auth.get_current_retailer),
    db: Session = Depends(get_db),
):
    customers = db.query(models.Customer).filter(
        models.Customer.retailer_id == current.id
    ).order_by(models.Customer.created_at.desc()).all()
    return [enrich_customer(c) for c in customers]


@app.post("/api/customers/upload")
async def upload_customers(
    file: UploadFile = File(...),
    current: models.Retailer = Depends(auth.get_current_retailer),
    db: Session = Depends(get_db),
):
    content = await file.read()
    text = content.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))

    imported = 0
    skipped = 0
    errors = []

    for row in reader:
        try:
            name = row.get("name", "").strip()
            email = row.get("email", "").strip()
            item = row.get("item_purchased", "").strip()
            purchase_date_str = row.get("purchase_date", "").strip()

            if not name or not email or not item or not purchase_date_str:
                skipped += 1
                continue

            # Parse date
            for fmt in ["%Y-%m-%d", "%m/%d/%Y", "%d/%m/%Y", "%m-%d-%Y"]:
                try:
                    purchase_date = datetime.strptime(purchase_date_str, fmt).replace(tzinfo=timezone.utc)
                    break
                except ValueError:
                    continue
            else:
                errors.append(f"Invalid date for {name}: {purchase_date_str}")
                skipped += 1
                continue

            # Check for duplicate within this retailer
            existing = db.query(models.Customer).filter(
                models.Customer.retailer_id == current.id,
                models.Customer.email == email,
            ).first()
            if existing:
                skipped += 1
                continue

            amount_str = row.get("purchase_amount", "0").strip().replace("$", "").replace(",", "")
            try:
                amount = float(amount_str) if amount_str else None
            except ValueError:
                amount = None

            customer = models.Customer(
                retailer_id=current.id,
                name=name,
                email=email,
                phone=row.get("phone", "").strip() or None,
                item_purchased=item,
                purchase_date=purchase_date,
                purchase_amount=amount,
                campaign_status=models.CampaignStatus.ACTIVE,
                current_touchpoint=0,
            )
            db.add(customer)
            imported += 1

        except Exception as e:
            errors.append(str(e))
            skipped += 1

    db.commit()
    return {"imported": imported, "skipped": skipped, "errors": errors[:10]}


@app.delete("/api/customers/{customer_id}")
def delete_customer(
    customer_id: int,
    current: models.Retailer = Depends(auth.get_current_retailer),
    db: Session = Depends(get_db),
):
    customer = db.query(models.Customer).filter(
        models.Customer.id == customer_id,
        models.Customer.retailer_id == current.id,
    ).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    db.delete(customer)
    db.commit()
    return {"ok": True}


# ─── CAMPAIGN ENGINE ──────────────────────────────────────────────────────────

def process_customer_touchpoint(
    customer: models.Customer,
    retailer: models.Retailer,
    db: Session,
    channel: str = "email",
):
    """Process a single customer's next due touchpoint."""
    due = campaign_engine.get_due_touchpoint(customer)
    if not due:
        return None

    tp_number, tp_name = due

    # Generate message
    msg = ai_generator.generate_message(
        customer=customer,
        retailer=retailer,
        touchpoint_number=tp_number,
        touchpoint_name=tp_name,
        channel=channel,
    )

    # Send message
    if channel == "email":
        result = message_sender.send_email(
            retailer=retailer,
            to_email=customer.email,
            to_name=customer.name,
            subject=msg["subject"] or f"A message from {retailer.store_name}",
            html_content=msg["body"],
        )
    else:
        if not customer.phone:
            return None
        result = message_sender.send_sms(
            retailer=retailer,
            to_phone=customer.phone,
            message_body=msg["body"],
        )

    # Log it
    log = models.CampaignLog(
        retailer_id=retailer.id,
        customer_id=customer.id,
        touchpoint_number=tp_number,
        touchpoint_name=tp_name,
        channel=channel,
        subject=msg.get("subject"),
        message_body=msg["body"],
        status=result["status"],
        message_id=result.get("message_id"),
    )
    db.add(log)

    # Update customer
    customer.current_touchpoint = tp_number
    customer.last_contacted = datetime.now(timezone.utc)
    if tp_number >= 6:
        customer.campaign_status = models.CampaignStatus.COMPLETED

    db.commit()
    return log


@app.post("/api/campaign/run")
def run_campaign(
    background_tasks: BackgroundTasks,
    current: models.Retailer = Depends(auth.get_current_retailer),
    db: Session = Depends(get_db),
):
    """Run the campaign engine for all active customers of this retailer."""
    customers = db.query(models.Customer).filter(
        models.Customer.retailer_id == current.id,
        models.Customer.campaign_status == models.CampaignStatus.ACTIVE,
    ).all()

    processed = 0
    for customer in customers:
        result = process_customer_touchpoint(customer, current, db, channel="email")
        if result:
            processed += 1

    return {"processed": processed, "total_active": len(customers)}


@app.post("/api/campaign/preview", response_model=schemas.CampaignPreviewResponse)
def preview_message(
    data: schemas.CampaignPreviewRequest,
    current: models.Retailer = Depends(auth.get_current_retailer),
    db: Session = Depends(get_db),
):
    customer = db.query(models.Customer).filter(
        models.Customer.id == data.customer_id,
        models.Customer.retailer_id == current.id,
    ).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    tp_name = campaign_engine.get_touchpoint_name(data.touchpoint_number)
    msg = ai_generator.generate_message(
        customer=customer,
        retailer=current,
        touchpoint_number=data.touchpoint_number,
        touchpoint_name=tp_name,
        channel=data.channel,
    )
    return schemas.CampaignPreviewResponse(
        channel=data.channel,
        subject=msg.get("subject"),
        body=msg["body"],
    )


@app.post("/api/campaign/send")
def send_message(
    data: schemas.CampaignSendRequest,
    current: models.Retailer = Depends(auth.get_current_retailer),
    db: Session = Depends(get_db),
):
    customer = db.query(models.Customer).filter(
        models.Customer.id == data.customer_id,
        models.Customer.retailer_id == current.id,
    ).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    tp_name = campaign_engine.get_touchpoint_name(data.touchpoint_number)

    if data.body:
        msg = {"subject": data.subject, "body": data.body}
    else:
        msg = ai_generator.generate_message(
            customer=customer,
            retailer=current,
            touchpoint_number=data.touchpoint_number,
            touchpoint_name=tp_name,
            channel=data.channel,
        )

    if data.channel == "email":
        result = message_sender.send_email(
            retailer=current,
            to_email=customer.email,
            to_name=customer.name,
            subject=msg["subject"] or f"A message from {current.store_name}",
            html_content=msg["body"],
        )
    else:
        result = message_sender.send_sms(
            retailer=current,
            to_phone=customer.phone or "",
            message_body=msg["body"],
        )

    log = models.CampaignLog(
        retailer_id=current.id,
        customer_id=customer.id,
        touchpoint_number=data.touchpoint_number,
        touchpoint_name=tp_name,
        channel=data.channel,
        subject=msg.get("subject"),
        message_body=msg["body"],
        status=result["status"],
        message_id=result.get("message_id"),
    )
    db.add(log)
    customer.current_touchpoint = data.touchpoint_number
    customer.last_contacted = datetime.now(timezone.utc)
    db.commit()

    return {"status": result["status"], "message": result.get("message")}


# ─── CAMPAIGN LOGS ────────────────────────────────────────────────────────────

@app.get("/api/logs", response_model=List[schemas.CampaignLogResponse])
def get_logs(
    current: models.Retailer = Depends(auth.get_current_retailer),
    db: Session = Depends(get_db),
):
    logs = db.query(models.CampaignLog).filter(
        models.CampaignLog.retailer_id == current.id
    ).order_by(models.CampaignLog.sent_at.desc()).limit(200).all()

    result = []
    for log in logs:
        customer = db.query(models.Customer).filter(models.Customer.id == log.customer_id).first()
        entry = schemas.CampaignLogResponse(
            id=log.id,
            retailer_id=log.retailer_id,
            customer_id=log.customer_id,
            customer_name=customer.name if customer else None,
            customer_email=customer.email if customer else None,
            store_name=current.store_name,
            touchpoint_number=log.touchpoint_number,
            touchpoint_name=log.touchpoint_name,
            channel=log.channel,
            subject=log.subject,
            message_body=log.message_body,
            status=log.status,
            opened=log.opened,
            clicked=log.clicked,
            sent_at=log.sent_at,
        )
        result.append(entry)
    return result


# ─── ANALYTICS ────────────────────────────────────────────────────────────────

@app.get("/api/analytics", response_model=schemas.AnalyticsResponse)
def get_analytics(
    current: models.Retailer = Depends(auth.get_current_retailer),
    db: Session = Depends(get_db),
):
    customers = db.query(models.Customer).filter(models.Customer.retailer_id == current.id).all()
    logs = db.query(models.CampaignLog).filter(models.CampaignLog.retailer_id == current.id).all()

    total_customers = len(customers)
    active = sum(1 for c in customers if c.campaign_status == "active")
    completed = sum(1 for c in customers if c.campaign_status == "completed")
    emails_sent = sum(1 for l in logs if l.channel == "email" and l.status in ["sent", "demo"])
    sms_sent = sum(1 for l in logs if l.channel == "sms" and l.status in ["sent", "demo"])
    opens = sum(1 for l in logs if l.opened)
    clicks = sum(1 for l in logs if l.clicked)
    total_sent = emails_sent + sms_sent

    open_rate = round((opens / total_sent * 100), 1) if total_sent > 0 else 0
    click_rate = round((clicks / total_sent * 100), 1) if total_sent > 0 else 0

    # Touchpoint breakdown
    from campaign_engine import TOUCHPOINTS
    tp_stats = []
    for tp_num, tp_name, _ in TOUCHPOINTS:
        tp_logs = [l for l in logs if l.touchpoint_number == tp_num]
        sent = sum(1 for l in tp_logs if l.status in ["sent", "demo"])
        tp_opens = sum(1 for l in tp_logs if l.opened)
        tp_clicks = sum(1 for l in tp_logs if l.clicked)
        tp_stats.append(schemas.TouchpointStat(
            touchpoint_number=tp_num,
            touchpoint_name=tp_name,
            sent=sent,
            opens=tp_opens,
            clicks=tp_clicks,
            open_rate=round((tp_opens / sent * 100), 1) if sent > 0 else 0,
        ))

    return schemas.AnalyticsResponse(
        total_customers=total_customers,
        active_campaigns=active,
        completed_campaigns=completed,
        total_emails_sent=emails_sent,
        total_sms_sent=sms_sent,
        total_opens=opens,
        total_clicks=clicks,
        open_rate=open_rate,
        click_rate=click_rate,
        touchpoint_breakdown=tp_stats,
    )


# ─── SUPER ADMIN ──────────────────────────────────────────────────────────────

@app.get("/api/admin/overview", response_model=schemas.AdminOverview)
def admin_overview(
    admin: models.Retailer = Depends(auth.get_current_super_admin),
    db: Session = Depends(get_db),
):
    from datetime import timedelta
    now = datetime.now(timezone.utc)
    month_ago = now - timedelta(days=30)

    total_retailers = db.query(models.Retailer).filter(
        models.Retailer.role == models.UserRole.RETAILER
    ).count()
    total_customers = db.query(models.Customer).count()
    all_logs = db.query(models.CampaignLog).all()
    emails_sent = sum(1 for l in all_logs if l.channel == "email" and l.status in ["sent", "demo"])
    sms_sent = sum(1 for l in all_logs if l.channel == "sms" and l.status in ["sent", "demo"])
    opens = sum(1 for l in all_logs if l.opened)
    total_sent = emails_sent + sms_sent
    open_rate = round((opens / total_sent * 100), 1) if total_sent > 0 else 0
    active = db.query(models.Customer).filter(models.Customer.campaign_status == "active").count()
    new_retailers = db.query(models.Retailer).filter(
        models.Retailer.role == models.UserRole.RETAILER,
        models.Retailer.created_at >= month_ago,
    ).count()

    return schemas.AdminOverview(
        total_retailers=total_retailers,
        total_customers=total_customers,
        total_emails_sent=emails_sent,
        total_sms_sent=sms_sent,
        total_opens=opens,
        open_rate=open_rate,
        active_campaigns=active,
        new_retailers_this_month=new_retailers,
    )


@app.get("/api/admin/retailers")
def admin_list_retailers(
    admin: models.Retailer = Depends(auth.get_current_super_admin),
    db: Session = Depends(get_db),
):
    retailers = db.query(models.Retailer).filter(
        models.Retailer.role == models.UserRole.RETAILER
    ).order_by(models.Retailer.created_at.desc()).all()

    result = []
    for r in retailers:
        customer_count = db.query(models.Customer).filter(models.Customer.retailer_id == r.id).count()
        emails_sent = db.query(models.CampaignLog).filter(
            models.CampaignLog.retailer_id == r.id,
            models.CampaignLog.status.in_(["sent", "demo"]),
        ).count()
        result.append({
            "id": r.id,
            "store_name": r.store_name,
            "email": r.email,
            "is_active": r.is_active,
            "customer_count": customer_count,
            "emails_sent": emails_sent,
            "has_brevo": bool(r.brevo_api_key),
            "has_twilio": bool(r.twilio_account_sid),
            "created_at": r.created_at.isoformat() if r.created_at else None,
        })
    return result


@app.put("/api/admin/retailers/{retailer_id}/toggle")
def admin_toggle_retailer(
    retailer_id: int,
    admin: models.Retailer = Depends(auth.get_current_super_admin),
    db: Session = Depends(get_db),
):
    retailer = db.query(models.Retailer).filter(models.Retailer.id == retailer_id).first()
    if not retailer:
        raise HTTPException(status_code=404, detail="Retailer not found")
    retailer.is_active = not retailer.is_active
    db.commit()
    return {"id": retailer_id, "is_active": retailer.is_active}


@app.get("/api/admin/logs")
def admin_all_logs(
    admin: models.Retailer = Depends(auth.get_current_super_admin),
    db: Session = Depends(get_db),
):
    logs = db.query(models.CampaignLog).order_by(
        models.CampaignLog.sent_at.desc()
    ).limit(500).all()

    result = []
    for log in logs:
        customer = db.query(models.Customer).filter(models.Customer.id == log.customer_id).first()
        retailer = db.query(models.Retailer).filter(models.Retailer.id == log.retailer_id).first()
        result.append({
            "id": log.id,
            "store_name": retailer.store_name if retailer else "Unknown",
            "customer_name": customer.name if customer else "Unknown",
            "customer_email": customer.email if customer else "Unknown",
            "touchpoint_number": log.touchpoint_number,
            "touchpoint_name": log.touchpoint_name,
            "channel": log.channel,
            "subject": log.subject,
            "status": log.status,
            "opened": log.opened,
            "sent_at": log.sent_at.isoformat() if log.sent_at else None,
        })
    return result


@app.get("/api/admin/customers")
def admin_all_customers(
    admin: models.Retailer = Depends(auth.get_current_super_admin),
    db: Session = Depends(get_db),
):
    customers = db.query(models.Customer).order_by(
        models.Customer.created_at.desc()
    ).limit(500).all()

    result = []
    for c in customers:
        retailer = db.query(models.Retailer).filter(models.Retailer.id == c.retailer_id).first()
        result.append({
            "id": c.id,
            "store_name": retailer.store_name if retailer else "Unknown",
            "name": c.name,
            "email": c.email,
            "item_purchased": c.item_purchased,
            "purchase_date": c.purchase_date.isoformat() if c.purchase_date else None,
            "campaign_status": c.campaign_status,
            "current_touchpoint": c.current_touchpoint,
        })
    return result
