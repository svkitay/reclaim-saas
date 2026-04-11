import os
from typing import Optional
import models

# Fallback templates when no AI key is available
FALLBACK_TEMPLATES = {
    1: {
        "subject": "Thank you for your recent purchase, {name}!",
        "body": """Hi {name},

Thank you so much for choosing {store_name} for your {item} purchase. We're thrilled to have you as a customer and hope you're absolutely loving your new piece!

We'd love to hear what you think. If you have a moment, leaving us a quick review would mean the world to us — it helps other customers find us and helps us keep improving.

If you have any questions about your {item} or need anything at all, please don't hesitate to reach out.

Warm regards,
The {store_name} Team"""
    },
    2: {
        "subject": "Care tips for your {item}, {name}",
        "body": """Hi {name},

We hope you're loving your {item}! It's been about a month since your purchase, and we wanted to share a few care tips to keep it looking beautiful for years to come.

Regular dusting with a soft, dry cloth will keep it looking fresh. Avoid placing it in direct sunlight to prevent fading. For deeper cleaning, use products specifically designed for your furniture type.

If you ever have questions about caring for your piece, our team is always happy to help.

Warm regards,
The {store_name} Team"""
    },
    3: {
        "subject": "Complete your space, {name} — pieces that pair perfectly",
        "body": """Hi {name},

It's been a few months since you brought home your {item}, and we hope it's become a beloved part of your home!

We thought you might love seeing what pairs beautifully with it. Our team has curated a selection of complementary pieces that customers who purchased similar items have absolutely loved.

Stop by or browse online — we'd love to help you build the perfect room around your {item}.

Warm regards,
The {store_name} Team"""
    },
    4: {
        "subject": "Ready to complete the room, {name}?",
        "body": """Hi {name},

Six months ago you made a great choice with your {item} — and we hope it's transformed your space!

Now might be the perfect time to think about completing the room. Whether it's accent pieces, lighting, or complementary furniture, we have everything you need to bring your vision together.

Come visit us and let our design team help you create something truly special.

Warm regards,
The {store_name} Team"""
    },
    5: {
        "subject": "Happy 1-year anniversary, {name}! 🎉",
        "body": """Hi {name},

Can you believe it's already been a year since you brought home your {item}? We hope it's brought you as much joy as it brought us to help you find it!

To celebrate your one-year anniversary with us, we'd love to offer you something special on your next visit. You're a valued part of the {store_name} family.

Thank you for choosing us — we look forward to helping you for many years to come.

Warm regards,
The {store_name} Team"""
    },
    6: {
        "subject": "We miss you, {name} — here's something special",
        "body": """Hi {name},

It's been a while since we've seen you, and we just wanted to reach out and say — we miss you!

A lot has changed since you purchased your {item}. We have beautiful new arrivals, exciting styles, and some incredible deals we think you'd love.

We'd love to welcome you back. Come visit us and see what's new — we have a feeling you'll find something you love just as much as your {item}.

Warm regards,
The {store_name} Team"""
    },
}

# Touchpoint-specific instructions for Claude
TOUCHPOINT_INSTRUCTIONS = {
    1: "Write a warm thank-you email. Ask for a review. Keep it brief and genuine. Do NOT recommend other products yet.",
    2: "Write a helpful care & maintenance tips email specific to the type of furniture they purchased. Give 3-4 practical tips. Do NOT push a sale.",
    3: "Write a cross-sell email recommending 2-3 complementary products from the catalogue below that would pair well with what they bought. Be specific — name the actual products. Frame it as a helpful suggestion, not a hard sell.",
    4: "Write a 'complete the room' email. Reference the item they bought and suggest 2-3 specific pieces from the catalogue that would complete the space. Be warm and design-focused.",
    5: "Write a 1-year purchase anniversary email. Celebrate the milestone, thank them for their loyalty, and mention 1-2 new arrivals from the catalogue they might love. Offer something special (e.g. priority service, a discount on their next visit).",
    6: "Write a win-back email. It's been 18 months since their purchase. Acknowledge the time, mention exciting new arrivals from the catalogue, and give them a compelling reason to come back. Be warm, not pushy.",
}


def generate_message(
    customer: models.Customer,
    retailer: models.Retailer,
    touchpoint_number: int,
    touchpoint_name: str,
    channel: str = "email",
) -> dict:
    """
    Generate a personalized message for a customer touchpoint.
    Uses Claude AI if an API key is available, otherwise uses fallback templates.
    Returns {"subject": str, "body": str}
    """
    # Use retailer's own key first, fall back to platform key
    api_key = retailer.anthropic_api_key or os.getenv("ANTHROPIC_API_KEY", "")
    store_name = retailer.sender_name or retailer.store_name
    catalogue_text = retailer.catalogue_text or ""

    if api_key:
        return _generate_with_claude(
            api_key=api_key,
            customer=customer,
            store_name=store_name,
            catalogue_text=catalogue_text,
            touchpoint_number=touchpoint_number,
            touchpoint_name=touchpoint_name,
            channel=channel,
        )
    else:
        return _generate_from_template(
            customer=customer,
            store_name=store_name,
            touchpoint_number=touchpoint_number,
            channel=channel,
        )


def _generate_with_claude(
    api_key: str,
    customer: models.Customer,
    store_name: str,
    catalogue_text: str,
    touchpoint_number: int,
    touchpoint_name: str,
    channel: str,
) -> dict:
    try:
        import anthropic

        client = anthropic.Anthropic(api_key=api_key)

        channel_instruction = (
            "Write a concise SMS message (under 160 characters if possible, max 320). No subject line needed."
            if channel == "sms"
            else "Write an email with a subject line and body."
        )

        email_format_note = (
            "Format your response EXACTLY as:\nSUBJECT: [subject line]\nBODY: [email body]"
            if channel == "email"
            else "Just write the SMS message text, nothing else."
        )

        amount_str = f"${customer.purchase_amount:,.2f}" if customer.purchase_amount else "not recorded"

        # Touchpoint-specific instruction
        tp_instruction = TOUCHPOINT_INSTRUCTIONS.get(
            touchpoint_number,
            f"Write a relevant follow-up email for touchpoint {touchpoint_number}: {touchpoint_name}."
        )

        # Include catalogue only for touchpoints where recommendations make sense (3, 4, 5, 6)
        catalogue_section = ""
        if catalogue_text and touchpoint_number in [3, 4, 5, 6]:
            catalogue_section = f"""
Store product catalogue (use these to make specific recommendations):
{catalogue_text[:2000]}
"""

        prompt = f"""You are writing a post-purchase follow-up {channel} for a furniture retailer called "{store_name}".

Customer details:
- Name: {customer.name}
- Item purchased: {customer.item_purchased}
- Purchase amount: {amount_str}

Touchpoint #{touchpoint_number}: {touchpoint_name}
Task: {tp_instruction}
{catalogue_section}
{channel_instruction}

Rules:
- Always address the customer by their first name
- Always reference their specific item purchased
- Sound warm, human, and personal — never like a mass marketing blast
- Keep emails under 200 words
- Sign off as "The {store_name} Team"

{email_format_note}"""

        message = client.messages.create(
            model="claude-3-5-haiku-20241022",
            max_tokens=700,
            messages=[{"role": "user", "content": prompt}]
        )

        response_text = message.content[0].text.strip()

        if channel == "sms":
            return {"subject": None, "body": response_text}

        # Parse email format
        subject = f"A message from {store_name}"
        body = response_text

        if "SUBJECT:" in response_text:
            lines = response_text.split("\n")
            for i, line in enumerate(lines):
                if line.startswith("SUBJECT:"):
                    subject = line.replace("SUBJECT:", "").strip()
                elif line.startswith("BODY:"):
                    body = "\n".join(lines[i:]).replace("BODY:", "").strip()
                    break

        return {"subject": subject, "body": body}

    except Exception as e:
        print(f"Claude API error: {e}")
        return _generate_from_template(
            customer=customer,
            store_name=store_name,
            touchpoint_number=touchpoint_number,
            channel=channel,
        )


def _generate_from_template(
    customer: models.Customer,
    store_name: str,
    touchpoint_number: int,
    channel: str,
) -> dict:
    template = FALLBACK_TEMPLATES.get(touchpoint_number, FALLBACK_TEMPLATES[1])

    subject = template["subject"].format(
        name=customer.name.split()[0],
        item=customer.item_purchased,
        store_name=store_name,
    )
    body = template["body"].format(
        name=customer.name.split()[0],
        item=customer.item_purchased,
        store_name=store_name,
    )

    if channel == "sms":
        # Condense to SMS length
        first_name = customer.name.split()[0]
        sms_templates = {
            1: f"Hi {first_name}! Thanks for your {customer.item_purchased} purchase from {store_name}. We'd love a review! Reply STOP to unsubscribe.",
            2: f"Hi {first_name}! Quick care tip for your {customer.item_purchased}: dust regularly & avoid direct sunlight. Questions? Just reply! – {store_name}",
            3: f"Hi {first_name}! Loving your {customer.item_purchased}? We have pieces that pair perfectly with it. Come visit us! – {store_name}",
            4: f"Hi {first_name}! Ready to complete the room around your {customer.item_purchased}? We'd love to help. – {store_name}",
            5: f"Hi {first_name}! Happy 1-year anniversary with your {customer.item_purchased}! 🎉 You're a valued customer. – {store_name}",
            6: f"Hi {first_name}! We miss you at {store_name}! Lots of new arrivals since your {customer.item_purchased}. Come see us!",
        }
        return {"subject": None, "body": sms_templates.get(touchpoint_number, sms_templates[1])}

    return {"subject": subject, "body": body}
