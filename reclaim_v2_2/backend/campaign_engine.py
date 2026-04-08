from datetime import datetime, timedelta, timezone
from typing import List, Tuple
import models

# Touchpoint definitions: (number, name, days_after_purchase)
TOUCHPOINTS = [
    (1, "Thank You + Review Request", 7),
    (2, "Care & Style Tips", 30),
    (3, "Cross-Sell Recommendation", 90),
    (4, "Complete the Room", 180),
    (5, "Purchase Anniversary", 365),
    (6, "Win-Back Campaign", 548),  # ~18 months
]


def get_due_touchpoint(customer: models.Customer) -> Tuple[int, str] | None:
    """
    Returns (touchpoint_number, touchpoint_name) if a touchpoint is due,
    or None if no touchpoint is due yet.
    """
    if customer.campaign_status != models.CampaignStatus.ACTIVE:
        return None

    now = datetime.now(timezone.utc)
    purchase_date = customer.purchase_date
    if purchase_date.tzinfo is None:
        purchase_date = purchase_date.replace(tzinfo=timezone.utc)

    days_since_purchase = (now - purchase_date).days
    next_tp_number = customer.current_touchpoint + 1

    if next_tp_number > 6:
        return None  # All touchpoints completed

    for tp_num, tp_name, tp_days in TOUCHPOINTS:
        if tp_num == next_tp_number and days_since_purchase >= tp_days:
            return (tp_num, tp_name)

    return None


def get_next_touchpoint_info(customer: models.Customer) -> dict:
    """Returns info about the next upcoming touchpoint for display."""
    if customer.campaign_status != models.CampaignStatus.ACTIVE:
        return {"name": "Campaign complete", "days_until": None, "overdue": False}

    now = datetime.now(timezone.utc)
    purchase_date = customer.purchase_date
    if purchase_date.tzinfo is None:
        purchase_date = purchase_date.replace(tzinfo=timezone.utc)

    days_since_purchase = (now - purchase_date).days
    next_tp_number = customer.current_touchpoint + 1

    if next_tp_number > 6:
        return {"name": "All touchpoints complete", "days_until": None, "overdue": False}

    for tp_num, tp_name, tp_days in TOUCHPOINTS:
        if tp_num == next_tp_number:
            days_until = tp_days - days_since_purchase
            return {
                "name": tp_name,
                "days_until": days_until,
                "overdue": days_until <= 0,
                "touchpoint_number": tp_num,
            }

    return {"name": "Unknown", "days_until": None, "overdue": False}


def get_touchpoint_name(number: int) -> str:
    for tp_num, tp_name, _ in TOUCHPOINTS:
        if tp_num == number:
            return tp_name
    return f"Touchpoint {number}"
