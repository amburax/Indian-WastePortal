# GO-LIVE Checklist — Indian Waste Portal

Work top to bottom. Everything ships in safe **`log`/dev** mode; this is the list to flip it to
production. Tick each box.

---

## 0. One-time setup
- [ ] `cp .env.example .env.local` and fill real values (see each section below).
- [ ] `npm install`
- [ ] Run migrations against the live DB:
  ```bash
  node --env-file=.env.local scripts/migrate.mjs
  node --env-file=.env.local scripts/migrate-payments.mjs
  ```

## 1. Security (do this first)
- [ ] **Rotate the admin password** (the seeded `admin@123` is public):
  ```bash
  node --env-file=.env.local scripts/rotate-admin.mjs admin@yourdomain.in 'StrongPass!'
  ```
- [ ] Set a long random `ADMIN_SECRET` and `PASSWORD_SALT`.
- [ ] Set strong, non-default **`ADMIN_SECRET` + `CLIENT_SECRET`** — the app now **refuses to start sessions in production** if these are missing/default. (The old dev payment-bypass path has been removed entirely.)
- [ ] Confirm `.env.local` is git-ignored; never commit secrets.

## 2. Payments (Razorpay)
- [ ] Set `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` / `NEXT_PUBLIC_RAZORPAY_KEY_ID` (live keys).
- [ ] Create a **Webhook** in the Razorpay dashboard → URL `https://<domain>/api/payment-webhook`,
      secret → `RAZORPAY_WEBHOOK_SECRET`. Enable events: `payment.captured`, `order.paid`,
      **`payment_link.paid`** (needed for balance invoices).
- [ ] Set `RETAINER_AMOUNT_PAISE` (default ₹499) and confirm plan/balance prices.
- [ ] Smoke-test the balance-invoice webhook path: `node --env-file=.env.local scripts/test-payment-link.mjs`.

## 3. WhatsApp / SMS (MSG91 or Gupshup)
- [ ] Register the 3 templates in `docs/whatsapp-templates.md` (UTILITY, en) and get them approved.
- [ ] Set `NOTIFY_PROVIDER=msg91` (or `gupshup`) + credentials + `MSG91_WA_TEMPLATE_*` names.
- [ ] Set inbound webhook URL `https://<domain>/api/webhooks/whatsapp?token=<WHATSAPP_WEBHOOK_SECRET>`.
- [ ] Confirm `NEXT_PUBLIC_WHATSAPP_NUMBER=918469876518` (the floating consultant button).
- [ ] Send yourself a test (register a throwaway org → check WhatsApp delivery).

## 4. Email (Resend)
- [ ] `EMAIL_PROVIDER=resend`, set `RESEND_API_KEY`.
- [ ] Verify your sending **domain** in Resend (SPF/DKIM) and set `EMAIL_FROM` to it.
- [ ] Register a throwaway org → confirm the receipt email arrives (not spam).

## 5. Filing worker (persistent)
- [ ] `mkdir -p logs`
- [ ] `pm2 start ecosystem.config.cjs` → `pm2 save && pm2 startup` (survives reboot).
- [ ] `pm2 logs iwp-worker` shows it polling. Decide mode:
      `AGENT_DEMO_MODE=false` + real `CPCB_PORTAL_URL` for live filing;
      `AGENT_HEADLESS=true` in prod.
- [ ] Ensure Chromium is installed for Playwright (`npx playwright install chromium`) or the
      msedge channel is available on the box.

## 6. Frontend polish
- [ ] Swap the **Capability Mosaic** placeholder photos (`components/CapabilityMosaic.jsx`) for real
      MRF / biomethanation / fleet images (any `https:` URL — CSP already allows it).
- [ ] Tighten CSP `img-src` from `https:` to your CDN host if you want it stricter
      (`next.config.js`).

## 7. Final smoke test (the whole funnel)
- [ ] Register → pay retainer → status `UnderReview` + WhatsApp/email received.
- [ ] Admin: Log Call → `Scheduled` → Send Invoice → `AwaitingPayment` (client gets link).
- [ ] Pay balance (or admin **Mark Balance Paid**) → `Paid`.
- [ ] Admin **Start Filing** → `Queued` → worker files → client enters OTP on their screen → `Completed`.
- [ ] Check `/admin/audit` shows every action and `/admin/calendar` shows the booking.

---

### Status lifecycle (reference)
```
New ──retainer──▶ UnderReview ──Log Call──▶ Scheduled ──Send Invoice──▶ AwaitingPayment
   ──balance paid──▶ Paid ──Start Filing──▶ Queued ──▶ In Progress ──▶ Completed
                                         (3 wrong OTPs ▶ NeedsAttention ▶ admin Reset & Retry)
```

### Provider quick-reference
| Capability | Env to flip | Default (safe) |
|---|---|---|
| WhatsApp/SMS | `NOTIFY_PROVIDER` = `msg91`/`gupshup` | `log` |
| Email | `EMAIL_PROVIDER` = `resend` | `log` |
| Payments | real `RAZORPAY_*` keys | placeholders → dev synthetic |
| Session secrets | `ADMIN_SECRET` / `CLIENT_SECRET` | required in prod (fails closed) |
