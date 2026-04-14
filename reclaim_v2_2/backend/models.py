from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Text, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import enum


class UserRole(str, enum.Enum):
    SUPER_ADMIN = "super_admin"
    RETAILER = "retailer"


class CampaignStatus(str, enum.Enum):
    ACTIVE = "active"
    COMPLETED = "completed"
    PAUSED = "paused"


class MessageStatus(str, enum.Enum):
    SENT = "sent"
    DEMO = "demo"
    FAILED = "failed"
    PENDING = "pending"


class Retailer(Base):
    """A furniture store / tenant on the platform."""
    __tablename__ = "retailers"

    id = Column(Integer, primary_key=True, index=True)
    store_name = Column(String(200), nullable=False)
    email = Column(String(200), unique=True, index=True, nullable=False)
    hashed_password = Column(String(200), nullable=False)
    role = Column(String(20), default=UserRole.RETAILER)
    is_active = Column(Boolean, default=True)

    # Store branding & sender info
    sender_name = Column(String(100), nullable=True)       # e.g. "Ashley Furniture"
    sender_email = Column(String(200), nullable=True)      # e.g. "hello@ashleyfurniture.com"
    sender_email_verified = Column(Boolean, default=False)  # True once Brevo has verified the sender
    store_logo_url = Column(String(500), nullable=True)
    store_website = Column(String(300), nullable=True)
    google_reviews_url = Column(String(500), nullable=True)
    store_phone = Column(String(50), nullable=True)

    # Email integration (Brevo)
    brevo_api_key = Column(String(300), nullable=True)

    # SMS integration (Twilio)
    twilio_account_sid = Column(String(100), nullable=True)
    twilio_auth_token = Column(String(100), nullable=True)
    twilio_phone_number = Column(String(30), nullable=True)

    # AI integration
    anthropic_api_key = Column(String(300), nullable=True)

    # Product catalogue (scraped from store website for AI recommendations)
    catalogue_url = Column(String(500), nullable=True)
    catalogue_text = Column(Text, nullable=True)
    catalogue_last_scraped = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    customers = relationship("Customer", back_populates="retailer", cascade="all, delete-orphan")
    campaign_logs = relationship("CampaignLog", back_populates="retailer", cascade="all, delete-orphan")


class Customer(Base):
    """A customer belonging to a specific retailer."""
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    retailer_id = Column(Integer, ForeignKey("retailers.id"), nullable=False, index=True)

    name = Column(String(200), nullable=False)
    email = Column(String(200), nullable=False)
    phone = Column(String(50), nullable=True)
    item_purchased = Column(String(300), nullable=False)
    purchase_date = Column(DateTime(timezone=True), nullable=False)
    purchase_amount = Column(Float, nullable=True)

    # Campaign tracking
    campaign_status = Column(String(20), default=CampaignStatus.ACTIVE)
    current_touchpoint = Column(Integer, default=0)  # 0 = not started, 1-6 = completed touchpoints
    last_contacted = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    retailer = relationship("Retailer", back_populates="customers")
    campaign_logs = relationship("CampaignLog", back_populates="customer", cascade="all, delete-orphan")


class CampaignLog(Base):
    """A log entry for every message sent (or attempted)."""
    __tablename__ = "campaign_logs"

    id = Column(Integer, primary_key=True, index=True)
    retailer_id = Column(Integer, ForeignKey("retailers.id"), nullable=False, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False, index=True)

    touchpoint_number = Column(Integer, nullable=False)
    touchpoint_name = Column(String(100), nullable=False)
    channel = Column(String(10), default="email")  # "email" or "sms"

    subject = Column(String(300), nullable=True)
    message_body = Column(Text, nullable=False)

    status = Column(String(20), default=MessageStatus.PENDING)
    message_id = Column(String(200), nullable=True)  # External message ID from Brevo/Twilio

    # Engagement tracking
    opened = Column(Boolean, default=False)
    clicked = Column(Boolean, default=False)
    opened_at = Column(DateTime(timezone=True), nullable=True)
    clicked_at = Column(DateTime(timezone=True), nullable=True)

    sent_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    retailer = relationship("Retailer", back_populates="campaign_logs")
    customer = relationship("Customer", back_populates="campaign_logs")
