# Indian Waste Portal — Roadmap & Remaining Work

Companion to **GO-LIVE.md** (credentials checklist). This is the feature/work backlog,
prioritised. Status as of the current build.

---

## ✅ Already built & verified
- Public site aligned to SWM Rules 2026 · green/brass brand · 3-step registration + consent gate
- Homepage: 5-slide hero banner (live June-30 countdown), 60-sec BWG self-check wizard, capability mosaic, threshold band
- **Two-gate filing model:** pay → admin releases → worker files (nothing files unsupervised)
- **Two-part payments:** ₹499 retainer → consultant call → balance invoice (Razorpay Payment Link) → filing
- **Admin Command Center:** login, submissions dashboard (filter/search/detail drawer), contextual actions
  (Log Call, Start Filing, Send Invoice, Mark Balance Paid, Reset & Retry, Set Status), **Audit** viewer, **Calendar**
- **OTP safety:** 3-attempt lockout, client enters OTP on own screen, admin Reset & Retry
- **Notifications:** provider-abstracted (log/MSG91/Gupshup) + WhatsApp FAB + transactional email (Resend) + inbound webhook
- **Ops:** PM2 worker persistence, admin password rotation, migrations, payment-link test harness
- Docs: GO-LIVE.md, .env.example, docs/whatsapp-templates.md

---

## 🔴 TIER 0 — Launch blockers (nothing is "live" without these)

### 0.1 Deployment architecture (decision + setup)
The app is dual-mode (SQLite local / Cloudflare D1). Production needs a home:
- **App hosting:** Vercel (easiest) OR Cloudflare Pages. Decide.
- **Database:** the worker + app share a DB. Options: Cloudflare **D1** (fits CF Pages), or a hosted SQLite/Postgres.
  ⚠️ Vercel is serverless — it can't run the long-lived worker or better-sqlite3 well. Realistic split:
  **app on Vercel/CF + a small VPS for the worker + a shared hosted DB (D1 or Postgres).**
- **Domain + SSL** (e.g. indianwasteportal.in).
- **The worker** (Playwright/Chromium) MUST run on an always-on VPS, not serverless.

### 0.2 The CPCB filing agent — the #1 product risk
`workers/playwright-agent.js` automates the **real** swm.cpcb.gov.in portal with **heuristic selectors that
have never been tested against the live site.** This is the actual product; everything else is scaffolding.
- [ ] Get a real CPCB test/staging login and do a **supervised dry-run** (`npm run worker:vis`).
- [ ] Map the agent's field selectors to the portal's real 5-step form (they will need fixing).
- [ ] Confirm OTP + captcha intercept works on the real page.
- [ ] Harden error/timeout/retry + screenshot capture for audit.
- **Until this is proven, keep `AGENT_DEMO_MODE=true`** (synthetic ACK) so nothing files wrongly.

### 0.3 Razorpay — test → live
- [ ] **Test keys** (no KYC) → run one real test payment through retainer + balance end-to-end.
- [ ] Complete **KYC** for live keys (PAN, bank, business proof).
- [ ] Register webhook `…/api/payment-webhook` (events: payment.captured, order.paid, **payment_link.paid**).
- [ ] Add **webhook idempotency** (ignore duplicate event ids — Razorpay retries).
- [ ] Decide retainer amount + plan/balance pricing.
- [ ] Refund/failed-payment handling (at least a manual admin path).

### 0.4 Security hardening
- [ ] `ALLOW_DEV_WEBHOOK_BYPASS=false`; rotate admin password; strong `ADMIN_SECRET` + `PASSWORD_SALT`.
- [ ] **Rate-limit** admin login + `/api/register` (brute-force / spam).
- [ ] Move secrets to the host's env manager (not committed `.env.local`).

---

## 🟠 TIER 1 — Admin & operations polish
- [ ] **Dashboard KPIs:** counts by status, retainer vs balance paid, revenue, conversion funnel (New→Paid→Completed).
- [ ] **Pagination / server-side search** on submissions (currently capped at 300).
- [ ] **Notification log view** in admin (the `notifications` table already captures everything).
- [ ] **Org detail edits + free-form notes** (beyond Log Call), and **auto-open org** from the Calendar's "Open" link (`?org=` is passed but not yet consumed).
- [ ] **Admin user management UI** (add/disable admins) + **enforce role** (admin vs superadmin — column exists, not enforced).
- [ ] **CSV export** of submissions for reconciliation.
- [ ] Notification **retry** on failed sends + delivery status surfaced from the inbound webhook.

## 🟡 TIER 2 — Client experience
- [ ] **Deliver the status link** to clients automatically (WhatsApp/email on submit — wiring exists once providers are live).
- [ ] **"Find my registration"** (email + OTP lookup) — today status is only reachable via the token URL.
- [ ] **Annual-return reminders** — a yearly cron nudging clients before June 30 (ties into the countdown hook).
- [ ] Post-completion: email/WhatsApp the **ACK number + certificate**.

## 🟢 TIER 3 — Legal & compliance (do before public launch)
- [ ] **Legal review of marketing claims** — the slider's SWM/GPCB/utility-disconnection statements and the "12b$" framing must be verified by a lawyer (false claims = liability).
- [ ] **Policy pages:** Privacy, Terms, Refund/Cancellation (Razorpay also requires these live).
- [ ] **GST invoicing** for payments (Razorpay can auto-generate; confirm your GST setup).
- [ ] PII/data-retention policy for the org + OTP data you store.

## 🔵 TIER 4 — Growth / nice-to-have
- [ ] Analytics (GA4 / Plausible) + funnel tracking on the slider CTAs & wizard.
- [ ] **Multi-language** (Hindi/Gujarati) — high value for the Indian SMB audience.
- [ ] Partner/consultant referral program; bulk enterprise onboarding.
- [ ] Automated test suite (currently only ad-hoc Playwright checks).

---

## 🎯 Recommended sequence
1. **Prove the CPCB agent** on the real portal (0.2) — this de-risks the whole product. Do it early, even before hosting.
2. **Razorpay test keys** (0.3) — validate the money flow end-to-end with zero paperwork.
3. **Deployment** (0.1) + **security flip** (0.4) — get it on a real domain safely.
4. **Admin KPIs + notification log + reminders** (Tier 1/2) — the ops you'll actually use daily.
5. **Legal pages + claim review** (Tier 3) — required before you drive public traffic.
6. Grow (Tier 4).

## ⚠️ Top 3 risks to watch
1. **The agent vs the real CPCB portal** — untested; likely needs selector fixes. Biggest unknown.
2. **Deployment split** — serverless app + always-on worker + shared DB is a real architecture task.
3. **Legal exposure** — strong compliance/legal claims in marketing copy need verification.
