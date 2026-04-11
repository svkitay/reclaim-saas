from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


# ─── Auth ────────────────────────────────────────────────────────────────────

class RetailerSignup(BaseModel):
    store_name: str
    email: str
    password: str

class RetailerLogin(BaseModel):
    email: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    retailer_id: int
    store_name: str
    role: str


# ─── Retailer ────────────────────────────────────────────────────────────────

class RetailerSettings(BaseModel):
    store_name: Optional[str] = None
    sender_name: Optional[str] = None
    sender_email: Optional[str] = None
    store_website: Optional[str] = None
    store_phone: Optional[str] = None
    brevo_api_key: Optional[str] = None
    twilio_account_sid: Optional[str] = None
    twilio_auth_token: Optional[str] = None
    twilio_phone_number: Optional[str] = None
    anthropic_api_key: Optional[str] = None

class RetailerProfile(BaseModel):
    id: int
    store_name: str
    email: str
    role: str
    sender_name: Optional[str]
    sender_email: Optional[str]
    sender_email_verified: Optional[bool] = False
    store_website: Optional[str]
    store_phone: Optional[str]
    has_brevo: bool
    has_twilio: bool
    has_anthropic: bool
    created_at: datetime
    customer_count: Optional[int] = 0
    emails_sent: Optional[int] = 0
    catalogue_url: Optional[str] = None
    catalogue_last_scraped: Optional[datetime] = None

    class Config:
        from_attributes = True


# ─── Customer ────────────────────────────────────────────────────────────────

class CustomerCreate(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None
    item_purchased: str
    purchase_date: str  # ISO date string
    purchase_amount: Optional[float] = None

class CustomerResponse(BaseModel):
    id: int
    retailer_id: int
    name: str
    email: str
    phone: Optional[str]
    item_purchased: str
    purchase_date: datetime
    purchase_amount: Optional[float]
    campaign_status: str
    current_touchpoint: int
    last_contacted: Optional[datetime]
    created_at: datetime
    next_touchpoint_name: Optional[str] = None
    days_until_next: Optional[int] = None
    next_is_overdue: Optional[bool] = False

    class Config:
        from_attributes = True


# ─── Campaign ────────────────────────────────────────────────────────────────

class CampaignPreviewRequest(BaseModel):
    customer_id: int
    touchpoint_number: int
    channel: str = "email"

class CampaignPreviewResponse(BaseModel):
    channel: str
    subject: Optional[str]
    body: str

class CampaignSendRequest(BaseModel):
    customer_id: int
    touchpoint_number: int
    channel: str = "email"
    subject: Optional[str] = None
    body: Optional[str] = None  # If provided, use this instead of generating


# ─── Campaign Log ────────────────────────────────────────────────────────────

class CampaignLogResponse(BaseModel):
    id: int
    retailer_id: int
    customer_id: int
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    store_name: Optional[str] = None
    touchpoint_number: int
    touchpoint_name: str
    channel: str
    subject: Optional[str]
    message_body: str
    status: str
    opened: bool
    clicked: bool
    sent_at: datetime

    class Config:
        from_attributes = True


# ─── Analytics ───────────────────────────────────────────────────────────────

class TouchpointStat(BaseModel):
    touchpoint_number: int
    touchpoint_name: str
    sent: int
    opens: int
    clicks: int
    open_rate: float

class AnalyticsResponse(BaseModel):
    total_customers: int
    active_campaigns: int
    completed_campaigns: int
    total_emails_sent: int
    total_sms_sent: int
    total_opens: int
    total_clicks: int
    open_rate: float
    click_rate: float
    touchpoint_breakdown: List[TouchpointStat]


# ─── Admin ───────────────────────────────────────────────────────────────────

class AdminOverview(BaseModel):
    total_retailers: int
    total_customers: int
    total_emails_sent: int
    total_sms_sent: int
    total_opens: int
    open_rate: float
    active_campaigns: int
    new_retailers_this_month: int
