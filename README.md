# Indian Waste Portal ♻️
### CPCB SWM 2026 — Bulk Waste Generator registration, done for you

Indian Waste Portal is a **consultant-assisted compliance service**. Businesses that
qualify as **Bulk Waste Generators (BWG)** under India's **Solid Waste Management (SWM)
Rules 2026** must register on the government **CPCB SWM portal**. This app collects their
details, takes payment, and our consultant **files the registration on CPCB for them** —
then records the official **Acknowledgement (ACK) number** back to the client.

> ⚖️ We are an **independent consultant — not a government body** and not affiliated with
> CPCB. The official record is always the CPCB ACK number (verifiable on swm.cpcb.gov.in).

📖 **Full documentation: [PROJECT-GUIDE.md](PROJECT-GUIDE.md)** — architecture, how it all
works, run/deploy instructions, and the go-live checklist. This README is the short version.

---

## How it works

```
Client registers → Admin sends invoice → Client pays →
Consultant files on CPCB (with the client's data) → Client shares the CPCB OTP
on their own status page → Consultant records the ACK → Client sees "Completed".
```

**Filing has two modes:**
- **Manual (default):** the consultant files on the CPCB portal by hand and presses
  **Record ACK & Complete**. An **OTP relay** lets the client enter their CPCB OTP on their
  own status page — we never read it aloud.
- **Automated (opt-in):** a background **Playwright** robot files CPCB automatically. Enabled
  only via `NEXT_PUBLIC_ENABLE_AUTO_FILING=true` + running the worker.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router) + React 18 + Tailwind CSS |
| i18n | English · हिंदी · ગુજરાતી |
| Backend | Next.js API routes; scrypt + HMAC signed-cookie auth |
| Database | SQLite (dev) · Turso/libSQL (serverless) · Cloudflare D1 (prod) — one code path |
| Payments | Razorpay (single fee from an admin price book) |
| Notifications | MSG91 (WhatsApp/SMS) · Resend (email) |
| Automation (optional) | Playwright (Chromium) |
| Hosting | Cloudflare Pages + D1 (planned) |

---

## Quick start

```bash
npm install
cp .env.example .env.local          # then fill in the values

npm run init-db                     # create the local SQLite DB
node --env-file=.env.local scripts/migrate-accounts.mjs
node --env-file=.env.local scripts/migrate-pricing.mjs
node --env-file=.env.local scripts/migrate-otp-relay.mjs

npm run dev                         # → http://localhost:3000
```

- Admin console: `http://localhost:3000/admin/login` (uses `ADMIN_EMAIL` / `ADMIN_PASSWORD`).
- ⚠️ **Don't run `npm run build` while `npm run dev` is running** — they share `.next` and it
  corrupts the dev server. Stop dev first.

**Test the whole flow in dev** (no real payment, no real portal): register → admin
**Send Invoice** → **Mark Balance Paid** → **Record ACK & Complete**. For the automated path,
set `NEXT_PUBLIC_ENABLE_AUTO_FILING=true` and run `npm run worker:demo`.

---

## Key features
- Multi-step registration: account → category + waste metrics → **LGD-linked address**
  (real cascading State → District → Sub-district → Village/pincode picker).
- Unified **client accounts** — one login manages every registration and future services.
- **Admin console** — submissions, invoicing, price book, Record-ACK, and the OTP relay.
- **E-Waste waitlist** (future service, same account).
- Honest, translated marketing site with live SWM-2026 deadline framing.

---

## BWG thresholds (meeting **any one** triggers registration)
| Metric | Threshold |
|---|---|
| Floor area | ≥ 20,000 sq.m |
| Waste generation | ≥ 100 kg/day |
| Water consumption | ≥ 40,000 L/day |

---

## Deployment & go-live
See **[PROJECT-GUIDE.md](PROJECT-GUIDE.md)** §8–9 for the Cloudflare Pages + D1 path and the
full go-live checklist (production DB + pincode seed, Razorpay keys, MSG91/Resend keys,
domain, and legal review). A Vercel + Turso path is in `DEPLOY-VERCEL.md`.

---

© 2026 Indian Waste Portal — an independent compliance consultant. Not affiliated with CPCB or any government body.
