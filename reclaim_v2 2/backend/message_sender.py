import os
import requests
from typing import Optional
import models


def send_email(
    retailer: models.Retailer,
    to_email: str,
    to_name: str,
    subject: str,
    html_content: str,
) -> dict:
    """
    Send an email via Brevo using the retailer's own API key and sender info.
    Falls back to platform key if retailer hasn't configured their own.
    """
    api_key = retailer.brevo_api_key or os.getenv("BREVO_API_KEY", "")
    from_email = retailer.sender_email or os.getenv("BREVO_SENDER_EMAIL", "noreply@reclaim.furniture")
    from_name = retailer.sender_name or retailer.store_name

    if not api_key:
        print(f"No Brevo API key for retailer {retailer.store_name} — demo mode")
        return {
            "status": "demo",
            "message_id": f"demo-{to_email}",
            "message": "Email logged but not sent (no Brevo API key configured)",
        }

    # Build branded HTML email
    if not html_content.startswith("<"):
        html_body = html_content.replace("\n\n", "</p><p>").replace("\n", "<br>")
        html_body = f"<p>{html_body}</p>"
    else:
        html_body = html_content

    full_html = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {{ font-family: Arial, sans-serif; background: #f8fafc; margin: 0; padding: 0; }}
    .container {{ max-width: 600px; margin: 40px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }}
    .header {{ background: #0B1120; padding: 24px 32px; }}
    .header h1 {{ color: white; margin: 0; font-size: 20px; letter-spacing: 1px; font-weight: 700; }}
    .header p {{ color: #94a3b8; margin: 4px 0 0 0; font-size: 13px; }}
    .body {{ padding: 32px; color: #1e293b; line-height: 1.7; font-size: 15px; }}
    .body p {{ margin: 0 0 16px 0; }}
    .footer {{ background: #f1f5f9; padding: 20px 32px; text-align: center; font-size: 12px; color: #94a3b8; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>{from_name}</h1>
      <p>Powered by Reclaim<span style="color:#0EA5E9;">.</span></p>
    </div>
    <div class="body">
      {html_body}
    </div>
    <div class="footer">
      <p>You're receiving this because you're a valued customer of {from_name}.</p>
      <p style="margin-top: 8px;"><a href="#" style="color: #0EA5E9;">Unsubscribe</a></p>
    </div>
  </div>
</body>
</html>"""

    url = "https://api.brevo.com/v3/smtp/email"
    headers = {
        "accept": "application/json",
        "api-key": api_key,
        "content-type": "application/json",
    }
    payload = {
        "sender": {"name": from_name, "email": from_email},
        "to": [{"email": to_email, "name": to_name}],
        "subject": subject,
        "htmlContent": full_html,
    }

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        if response.status_code in (200, 201):
            return {
                "status": "sent",
                "message_id": response.json().get("messageId", "unknown"),
                "message": "Email sent successfully",
            }
        else:
            print(f"Brevo error {response.status_code}: {response.text}")
            return {
                "status": "failed",
                "message_id": None,
                "message": f"Brevo error {response.status_code}: {response.text}",
            }
    except Exception as e:
        print(f"Email send exception: {e}")
        return {"status": "failed", "message_id": None, "message": str(e)}


def send_sms(
    retailer: models.Retailer,
    to_phone: str,
    message_body: str,
) -> dict:
    """
    Send an SMS via Twilio using the retailer's own credentials.
    """
    account_sid = retailer.twilio_account_sid or os.getenv("TWILIO_ACCOUNT_SID", "")
    auth_token = retailer.twilio_auth_token or os.getenv("TWILIO_AUTH_TOKEN", "")
    from_number = retailer.twilio_phone_number or os.getenv("TWILIO_PHONE_NUMBER", "")

    if not account_sid or not auth_token or not from_number:
        print(f"No Twilio credentials for retailer {retailer.store_name} — demo mode")
        return {
            "status": "demo",
            "message_id": f"demo-sms-{to_phone}",
            "message": "SMS logged but not sent (no Twilio credentials configured)",
        }

    # Clean phone number
    clean_phone = "".join(filter(lambda x: x.isdigit() or x == "+", to_phone))
    if not clean_phone.startswith("+"):
        clean_phone = "+1" + clean_phone  # Default to US

    url = f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Messages.json"

    try:
        response = requests.post(
            url,
            data={
                "From": from_number,
                "To": clean_phone,
                "Body": message_body,
            },
            auth=(account_sid, auth_token),
            timeout=10,
        )
        if response.status_code in (200, 201):
            data = response.json()
            return {
                "status": "sent",
                "message_id": data.get("sid", "unknown"),
                "message": "SMS sent successfully",
            }
        else:
            print(f"Twilio error {response.status_code}: {response.text}")
            return {
                "status": "failed",
                "message_id": None,
                "message": f"Twilio error {response.status_code}: {response.text}",
            }
    except Exception as e:
        print(f"SMS send exception: {e}")
        return {"status": "failed", "message_id": None, "message": str(e)}
