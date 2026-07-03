# Wasteebank 🏦♻️
### GPCB/CPCB Bulk Waste Generator Compliance Middleware

---

## What is Wasteebank?

Wasteebank is an end-to-end compliance middleware platform that automates mandatory **CPCB Solid Waste Management (SWM)** registration for Bulk Waste Generators in India.

It handles:
- Real-time BWG threshold eligibility checks
- Multi-step registration with LGD-verified addresses
- Secure Razorpay payment processing
- **Autonomous Playwright agent** that files on the CPCB portal and retrieves the Acknowledgement Number

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router) + React 18 |
| Styling | TailwindCSS 3.4 + Custom Glassmorphism Design System |
| Database | SQLite via `better-sqlite3` (local dev) |
| Payments | Razorpay |
| Automation | Playwright (Chromium headless) |
| Deployment | ⏸️ Paused — Cloudflare Pages + D1 (planned) |

---

## Project Structure

```
d:\anti-swaste\
├── app/
│   ├── globals.css              ← Design system (glassmorphism, ruby tokens)
│   ├── layout.jsx               ← Root layout with metadata
│   ├── page.jsx                 ← Landing page
│   ├── register/page.jsx        ← 4-step registration flow
│   ├── portal/page.jsx          ← Freemium lock + payment gate
│   ├── status/[token]/page.jsx  ← Live status tracker
│   └── api/
│       ├── register/route.js    ← POST: Create org account
│       ├── metrics/route.js     ← POST: Save BWG metrics
│       ├── address/route.js     ← POST: Save LGD address
│       ├── payment/create-order/route.js   ← POST: Create Razorpay order
│       ├── payment-webhook/route.js        ← POST: Verify payment + update status
│       ├── ewaste-waitlist/route.js        ← POST: E-Waste email capture
│       └── status/[token]/route.js        ← GET: Status lookup
├── components/
│   ├── GlassCard.jsx            ← Reusable glassmorphism panel
│   ├── ThresholdCalculator.jsx  ← Real-time BWG threshold widget
│   ├── EWasteModal.jsx          ← E-Waste waitlist modal
│   ├── PricingSection.jsx       ← 3-tier pricing cards
│   ├── StepProgress.jsx         ← Multi-step form progress
│   └── PaymentButton.jsx        ← Razorpay checkout wrapper
├── lib/
│   ├── db.js                    ← SQLite singleton + prepared statements
│   └── schema.sql               ← Full DB schema (5 tables + indexes + triggers)
├── scripts/
│   ├── agent.js                 ← Playwright CPCB automation agent
│   └── init-db.js               ← DB initializer
├── .env.local                   ← Environment variables
├── next.config.js
├── tailwind.config.js
└── package.json
```

---

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Install Playwright browsers
```bash
npx playwright install chromium
```

### 3. Configure environment
```bash
# Edit .env.local and fill in:
# RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET
```

### 4. Initialize the database
```bash
npm run init-db
```

### 5. Start development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## BWG Thresholds (CPCB SWM Rules 2016)

Meeting **any one** of these thresholds triggers mandatory Bulk Waste Generator registration:

| Metric | Threshold |
|---|---|
| Floor Area | ≥ 20,000 sq.m |
| Waste Generation | ≥ 100 kg/day |
| Water Consumption | ≥ 40,000 L/day |

---

## Pricing

| Plan | Target | Fee |
|---|---|---|
| Standard | Residential Complexes | ₹2,999 |
| Professional | Commercial / Institutional | ₹7,499 |
| Enterprise | Multi-site Corporations | ₹24,999/site |

---

## Running the Automation Agent

After a payment is verified (status = `Paid`), run:

```bash
node scripts/agent.js
```

The agent will:
1. Find all `Paid` orgs in the database
2. Open a headless Chromium browser
3. Navigate to `https://swm.cpcb.gov.in`
4. Fill the registration form with org data
5. Extract the Acknowledgement Number
6. Update DB status → `Completed`

Screenshots are saved to `./agent-screenshots/` for debugging.

### Demo Mode (testing without real portal)
```bash
AGENT_DEMO_MODE=true node scripts/agent.js
```

This generates a synthetic ACK number without hitting the real portal.

---

## Database Schema

Five tables:
- `organizations` — core org data, status, payment token, ACK number
- `metrics` — BWG threshold values (floor area, waste, water)
- `lgd_addresses` — LGD-verified state/district/city
- `payments` — Razorpay order & payment records
- `ewaste_waitlist` — E-Waste early access signups
- `agent_logs` — automation audit trail with screenshots

---

## ⏸️ Deployment (Paused)

Deployment configuration for **Cloudflare Pages + D1** is pending.

When ready:
1. Replace `better-sqlite3` with D1 binding in `lib/db.js`
2. Create `wrangler.toml` with D1 database config
3. Run `wrangler d1 execute wasteebank-db --file=lib/schema.sql`
4. Deploy: `wrangler pages deploy`

---

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_PATH` | Path to SQLite file (default: `./wasteebank.db`) |
| `RAZORPAY_KEY_ID` | Razorpay API Key ID |
| `RAZORPAY_KEY_SECRET` | Razorpay API Key Secret |
| `RAZORPAY_WEBHOOK_SECRET` | Razorpay Webhook signing secret |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Public key for frontend checkout |
| `CPCB_PORTAL_URL` | CPCB SWM portal URL |
| `AGENT_DEMO_MODE` | Set to `true` for synthetic ACK generation |

---

© 2024 Wasteebank. Not affiliated with GPCB or CPCB.
