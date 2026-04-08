# RECLAIM. — Multi-Tenant SaaS Platform
### *Turn your past customers into your next sale.*

Reclaim is an AI-powered post-purchase remarketing automation platform built specifically for furniture retailers. This is **Version 2** — a full multi-tenant SaaS where retailers self-sign-up, manage their own customers and campaigns, and you (the platform owner) have a master admin dashboard to oversee everything.

---

## What's New in v2

| Feature | Description |
|---------|-------------|
| **Retailer Signup** | Any furniture store can create a free account at `/signup` |
| **Isolated Data** | Each retailer only sees their own customers and campaigns |
| **Per-Retailer Settings** | Each store configures their own Brevo, Twilio, and Claude API keys |
| **Custom Sender Identity** | Emails go out from the retailer's own name and email address |
| **SMS Support** | Retailers can connect Twilio to send SMS touchpoints |
| **Super Admin Dashboard** | You see every retailer, customer, and campaign across the entire platform |
| **Secure Auth** | JWT-based login with 7-day sessions |

---

## Quick Start (3 Steps)

### Step 1 — Start the Backend

```bash
cd reclaim_v2/backend
pip3 install -r requirements.txt
cp .env.example .env
python3 -m uvicorn main:app --reload --port 8001
```

You should see: `Reclaim API v2 started. Database initialized.`

### Step 2 — Start the Frontend (new terminal)

```bash
cd reclaim_v2/frontend
npm install
npm run dev
```

### Step 3 — Open in Browser

Go to: **http://localhost:5173**

---

## Accounts

### Your Super Admin Account (pre-created automatically)
- **URL:** http://localhost:5173/login
- **Email:** `admin@reclaim.furniture`
- **Password:** `reclaim-admin-2024`

> Change these in `backend/.env` before sharing with anyone.

### Retailer Accounts
Retailers sign up themselves at: **http://localhost:5173/signup**

They enter their store name, email, and password — and land directly in their own dashboard.

---

## Folder Structure

```
reclaim_v2/
├── backend/
│   ├── main.py              # FastAPI app — all routes
│   ├── models.py            # Database models (Retailer, Customer, Campaign, Log)
│   ├── auth.py              # JWT auth + password hashing
│   ├── campaign_engine.py   # 6-touchpoint campaign logic
│   ├── ai_generator.py      # Claude AI message generation
│   ├── message_sender.py    # Email (Brevo) + SMS (Twilio) sending
│   ├── schemas.py           # Pydantic request/response schemas
│   ├── database.py          # SQLite database setup
│   ├── .env.example         # Environment variable template
│   └── requirements.txt     # Python dependencies
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── Login.tsx
│       │   ├── Signup.tsx
│       │   ├── retailer/    # Retailer-facing pages
│       │   │   ├── Dashboard.tsx
│       │   │   ├── Customers.tsx
│       │   │   ├── Analytics.tsx
│       │   │   ├── CampaignLog.tsx
│       │   │   └── Settings.tsx
│       │   └── admin/       # Super admin pages
│       │       ├── AdminOverview.tsx
│       │       ├── AdminRetailers.tsx
│       │       ├── AdminCustomers.tsx
│       │       └── AdminLogs.tsx
│       ├── components/      # Shared UI components
│       ├── context/         # Auth context
│       └── utils/api.ts     # API client
└── sample_data/
    └── customers.csv        # Sample CSV for testing
```

---

## API Keys Setup

Each retailer configures their own keys in **Settings** inside the app. As the platform owner, you can optionally set platform-wide defaults in `backend/.env`.

### Brevo (Email)
1. Go to https://app.brevo.com → Sign up free
2. Settings → API Keys → Create a new key
3. Paste into the retailer's Settings page → Email Integration

### Twilio (SMS) — Optional
1. Go to https://twilio.com → Sign up
2. Get your Account SID, Auth Token, and a phone number
3. Paste into the retailer's Settings page → SMS Integration

### Anthropic Claude (AI Messages) — Optional
1. Go to https://console.anthropic.com → Sign up
2. API Keys → Create key
3. Paste into the retailer's Settings page → AI Message Generation

> Without any API keys, Reclaim runs in **Demo Mode** — messages are generated from built-in templates and logged, but not actually sent. Perfect for testing.

---

## The 6-Touchpoint Campaign Sequence

| Touchpoint | Timing | Message Type |
|------------|--------|--------------|
| 1 | Day 7 | Thank You + Review Request |
| 2 | Day 30 | Care & Style Tips |
| 3 | Month 3 | Cross-Sell Recommendation |
| 4 | Month 6 | Complete the Room |
| 5 | Month 12 | Purchase Anniversary |
| 6 | Month 18+ | Win-Back Campaign |

---

## Admin Dashboard

Log in as `admin@reclaim.furniture` to access:

- **Overview** — Total retailers, customers, emails sent, open rates across the entire platform
- **Retailers** — Every store on the platform, their join date, customer count, and campaign activity
- **Customers** — Every customer across all retailers, searchable and filterable
- **All Logs** — Every message ever sent across the entire platform

---

## CSV Import Format

Retailers upload a CSV with these columns:

```
name,email,phone,item_purchased,purchase_date,purchase_amount
Sarah Johnson,sarah@email.com,555-0101,Sectional Sofa,2024-06-15,2499.00
```

A sample file is included at `sample_data/customers.csv`.

---

## Running Every Time

**Terminal 1 (Backend):**
```bash
cd reclaim_v2/backend && python3 -m uvicorn main:app --reload --port 8001
```

**Terminal 2 (Frontend):**
```bash
cd reclaim_v2/frontend && npm run dev
```

Then open **http://localhost:5173**

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `pip: command not found` | Use `pip3` instead |
| `python: command not found` | Use `python3` instead |
| Port 8001 already in use | Run `lsof -ti:8001 \| xargs kill` then retry |
| Frontend shows blank page | Make sure backend is running on port 8001 |
| `npm install` fails | Try `npm install --legacy-peer-deps` |
| Login fails | Make sure backend started successfully (check terminal for errors) |

---

*Reclaim v2 — Built for scale. Ready to sell.*
