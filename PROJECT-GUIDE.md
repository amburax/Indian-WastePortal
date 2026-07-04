# Indian Waste Portal — Project Guide

The complete, current picture of what this site is, how it works, how it's built, how
to run it, and what's left to go live. Read this first.

---

## 1. What this is (in plain words)

**Indian Waste Portal** is a **consultant-assisted compliance service**. Businesses that
qualify as **Bulk Waste Generators (BWG)** under India's **Solid Waste Management (SWM)
Rules 2026** must register on the government **CPCB SWM portal** (swm.cpcb.gov.in). This
site collects their details, takes payment, and **our consultant files the registration
on the CPCB portal for them**, then records the official **Acknowledgement (ACK) number**
back to the client.

> We are an **independent consultant — not a government body** and not affiliated with
> CPCB. The official record is always the CPCB ACK number (verifiable on swm.cpcb.gov.in).

There's also a **future E-Waste service** (currently a waitlist) under the same account.

---

## 2. How it works — the end-to-end flow

```
CLIENT                          ADMIN (you / consultant)              CPCB PORTAL
──────                          ────────────────────────              ───────────
Register (/register)  ───────►  appears in admin console
  account + facility data
                                Send Invoice  ──────────────────────► (Razorpay link)
Pay the invoice       ◄───────  (or admin "Mark Balance Paid" in dev)
  status → Paid
                                Consultant fills the form  ─────────► fills 5-step BWG form
                                "Request OTP from client"
Enter CPCB OTP on      ───────► OTP appears in admin (live)  ───────► verify mobile + submit
 own status page                Record ACK & Complete  ◄───────────── ACK number issued
See ACK on status page ◄─────── status → Completed
```

**Two "gates" protect the flow:** (1) payment must be verified, and (2) the consultant
explicitly acts — nothing files itself.

**Filing has two modes:**
- **Manual (default, recommended):** the consultant files on CPCB by hand using the data
  in the admin console, then presses **Record ACK & Complete**. The **OTP relay** lets the
  client enter their CPCB OTP on their own status page (we never read it aloud).
- **Automated (opt-in):** a background **Playwright robot** fills CPCB automatically. Turned
  on only by setting `NEXT_PUBLIC_ENABLE_AUTO_FILING=true` and running the worker.

---

## 3. Architecture at a glance

```
┌─────────────────────────────────────────────────────────────┐
│  FRONTEND  — Next.js 14 (App Router) + React + Tailwind CSS  │
│  Pages: /, /register, /login, /dashboard, /status/[token],   │
│         /portal, /admin, /certificate/[token], /legal/*      │
│  i18n: English / हिंदी / ગુજરાતી  (lib/i18n.jsx)             │
└───────────────┬─────────────────────────────────────────────┘
                │  fetch()
┌───────────────▼─────────────────────────────────────────────┐
│  BACKEND  — Next.js API route handlers (app/api/**/route.js) │
│  register · account (auth) · admin actions · payment-webhook │
│  intercept/otp · lgd (pincode) · status · queue/position     │
│  Auth: stateless HMAC signed cookies (admin + client)        │
└───────────────┬─────────────────────────────────────────────┘
                │  getDb()  (auto-selects the backend)
┌───────────────▼─────────────────────────────────────────────┐
│  DATABASE  — one code path, three backends (lib/d1-db.js):   │
│   • local dev  → better-sqlite3 file (wasteebank.db)         │
│   • serverless → Turso / libSQL   (if TURSO_DATABASE_URL set)│
│   • production → Cloudflare D1     (if DB binding present)   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  WORKER (optional, automated mode only) — separate process   │
│  workers/queue-consumer.js  → drives  workers/playwright-    │
│  agent.js (a Chromium robot that files the 5-step CPCB form).│
│  Runs on a VPS, NOT on Vercel/Cloudflare (needs a browser).  │
└─────────────────────────────────────────────────────────────┘
```

### Frontend
- **Next.js 14 App Router**, React 18, **Tailwind CSS** (config in `tailwind.config.js`,
  styles in `app/globals.css`). Mostly client components (`'use client'`).
- **i18n** via a React context in `lib/i18n.jsx` (English/Hindi/Gujarati).
- Key components: `FullscreenHero`, `CapabilityMosaic`, `PricingSection`,
  `QueueStatus` (client status widget), `PaymentButton` (Razorpay).

### Backend (API)
- Plain **Next.js route handlers** under `app/api/`. No separate server.
- **Auth** (`lib/admin-auth.js`, `lib/client-auth.js`): passwords hashed with **scrypt**
  (self-contained salt); sessions are **stateless HMAC-signed cookies** (`iwp_admin`,
  `iwp_client`). Secrets come from env and **fail closed in production** if unset.
- **Rate limiting** (`lib/ratelimit.js`) — in-memory (swap to Upstash for real scale).
- **Error reporting** (`lib/observability.js`) — logs + optional `ERROR_WEBHOOK_URL`.

### Database
- **`lib/d1-db.js`** exposes one async interface (`db.get/all/run`) and picks the backend
  automatically. **`lib/schema.sql`** is the base schema; `scripts/migrate-*.mjs` add later
  columns/tables. Main tables: `organizations`, `metrics`, `lgd_addresses`, `payments`,
  `users`, `admin_users`, `queue_jobs`, `pricing_rules`, `pincode_directory`,
  `ewaste_waitlist`, `notifications`, `audit_log`, `agent_logs`.

### Payments — Razorpay
- Single one-time fee, priced by **establishment type × location** from an admin-editable
  **price book** (`pricing_rules`). Admin **Send Invoice** → Razorpay Payment Link →
  webhook verifies (`app/api/payment-webhook`). In dev (no keys) the admin **Mark Balance
  Paid** button simulates payment.

### Notifications
- `lib/notify.js` (WhatsApp/SMS via **MSG91**) + `lib/email.js` (email via **Resend**).
  Both default to **`log` mode** (print, don't send) until provider keys are set.

---

## 4. Tech stack
| Layer | Tech |
|---|---|
| Framework | Next.js 14 (App Router), React 18 |
| Styling | Tailwind CSS |
| Database | SQLite (dev) · Turso/libSQL (serverless) · Cloudflare D1 (prod) |
| Auth | scrypt + HMAC signed cookies (no library) |
| Payments | Razorpay |
| Notifications | MSG91 (WhatsApp/SMS), Resend (email) |
| Automation (optional) | Playwright (Chromium) |
| Hosting | Cloudflare Pages + D1 (planned) |

---

## 5. Project structure
```
app/                 Next.js pages + API routes
  page.jsx           Landing page (hero, services, pricing, deadlines)
  register/          Multi-step signup (account → category+metrics → LGD address)
  dashboard/         Client account home (all registrations + invoices)
  status/[token]/    Public per-registration tracker (+ OTP relay card)
  portal/            Payment page
  admin/             Consultant console (submissions, actions, price book)
  certificate/[token]/  Filing-acknowledgement print page
  api/               All backend endpoints
components/          React UI components
lib/                 db, auth, i18n, razorpay, notify, email, ratelimit, observability
workers/             queue-consumer.js + playwright-agent.js (automated mode)
scripts/             migrations, seeders, smoke test, image optimizer
public/mosaic/       Facility photos (WebP)
```

---

## 6. Run it locally
```bash
npm install
cp .env.example .env.local          # then fill values (see §7)
npm run init-db                     # create the local SQLite DB
node --env-file=.env.local scripts/migrate-accounts.mjs
node --env-file=.env.local scripts/migrate-pricing.mjs
node --env-file=.env.local scripts/migrate-otp-relay.mjs
npm run dev                         # → http://localhost:3000
```
- Admin console: `http://localhost:3000/admin/login` (uses `ADMIN_EMAIL`/`ADMIN_PASSWORD`).
- **Do not run `npm run build` while `npm run dev` is running** — they share `.next` and it
  corrupts the dev server's CSS/JS. Stop dev first.

**Test the full flow in dev (no real payment / no real portal):**
1. Register at `/register`.  2. Admin → **Send Invoice** → **Mark Balance Paid**.
3. Manual: **Record ACK & Complete** (type any ACK) → client sees it.
   Automated (optional): set `NEXT_PUBLIC_ENABLE_AUTO_FILING=true`, then
   `npm run worker:demo` (simulates the 5 CPCB steps, never touches the real portal).

---

## 7. Environment variables (`.env.example` is the template)
| Key | Purpose |
|---|---|
| `PASSWORD_SALT`, `ADMIN_SECRET`, `CLIENT_SECRET` | crypto secrets (must be strong in prod) |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | seeded admin login |
| `DATABASE_PATH` | local SQLite file |
| `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` | serverless DB (Vercel/Turso) |
| `RAZORPAY_KEY_ID/_SECRET/_WEBHOOK_SECRET`, `NEXT_PUBLIC_RAZORPAY_KEY_ID` | real payments |
| `NOTIFY_PROVIDER` + `MSG91_*` | real WhatsApp/SMS (else `log`) |
| `EMAIL_PROVIDER` + `RESEND_API_KEY` | real email (else `log`) |
| `NEXT_PUBLIC_ENABLE_AUTO_FILING` | show the automated "Start Filing" button |
| `APP_BASE_URL`, `NEXT_PUBLIC_APP_URL` | your public URL (for links) |
| `ERROR_WEBHOOK_URL` | optional Slack/Discord error alerts |

Never commit `.env.local`.

---

## 8. Deploying (Cloudflare Pages + D1 — planned)
The app already has the **D1** code path. Cloudflare needs a Next.js adapter
(`@opennextjs/cloudflare` / `next-on-pages`) and a check that Node `scrypt` works on its
runtime (or swap auth to Web-Crypto PBKDF2). Then: create D1, apply `schema.sql` + the
migrations, seed admin + pricing + the **~155k `pincode_directory` rows**, bind `DB`, set
the env vars, deploy. (A Vercel + Turso path is documented in `DEPLOY-VERCEL.md` if ever
needed.)

---

## 9. What's left to go live (checklist)
- [ ] **Deploy to production** (Cloudflare Pages + D1) and **seed the pincode data** there.
- [ ] **Razorpay live keys** → accept real payments.
- [ ] **MSG91 + Resend keys** → clients actually receive links/OTP prompts/receipts.
- [ ] **Domain** (indianwasteportal.in) + HTTPS.
- [ ] **Legal review** of the Terms/Privacy/Refund pages (still marked draft) and of the
      "deadline / Environmental Compensation" wording.
- [ ] **Business identity** in the footer (company, GST, address).
- [ ] Later: SEO, honest social proof, the E-Waste build, and the automated Playwright
      worker once volume justifies it.
