# WhatsApp Template Registration (MSG91 / Meta)

WhatsApp **business-initiated** messages must use a template that Meta has approved.
Register the three templates below in your provider console, then put their names in `.env.local`.

> **Category:** all three are **UTILITY** (transactional). Do **not** pick MARKETING — utility
> templates have far higher approval rates and no marketing-opt-in friction.
> **Language:** `en` (English).
> Each uses one body variable `{{1}}` which our code fills from `lib/notify.js`.

The code resolves the template per notification type:

| Notification `type` | Env var | Fallback |
|---|---|---|
| `submission_ack` | `MSG91_WA_TEMPLATE_ACK` | `MSG91_WA_TEMPLATE` → `iwp_notification` |
| `otp_link` | `MSG91_WA_TEMPLATE_OTP` | `MSG91_WA_TEMPLATE` → `iwp_notification` |
| `needs_attention` | `MSG91_WA_TEMPLATE_ALERT` | `MSG91_WA_TEMPLATE` → `iwp_notification` |

---

## Template 1 — Booking / payment acknowledgement
- **Name:** `iwp_booking_ack`
- **Category:** UTILITY · **Language:** en
- **Body:**
  ```
  Indian Waste Portal: {{1}}
  ```
- **Sample for {{1}}:** `Booking confirmed. Our consultant will call you within 24 hours to schedule your CPCB filing.`
- **Footer (optional, fixed):** `We never ask for your OTP over a call.`

## Template 2 — Action needed (OTP entry / balance invoice link)
- **Name:** `iwp_action_link`
- **Category:** UTILITY · **Language:** en
- **Body:**
  ```
  Indian Waste Portal — action needed: {{1}}
  ```
- **Sample for {{1}}:** `Enter the CPCB OTP to complete your filing → https://indianwasteportal.in/status/abc123`
- *Tip:* if you want a tappable **button** instead of an inline URL, add a **Call-To-Action → Visit Website (Dynamic)** button with `{{1}}` as the URL suffix, and change the body to a fixed sentence. (Optional; the inline-URL version above works as-is with our code.)

## Template 3 — Needs attention / on-hold
- **Name:** `iwp_needs_attention`
- **Category:** UTILITY · **Language:** en
- **Body:**
  ```
  Indian Waste Portal: {{1}} Our consultant will contact you shortly.
  ```
- **Sample for {{1}}:** `We could not verify your OTP after 3 attempts.`

---

## After approval — set in `.env.local`
```ini
NOTIFY_PROVIDER=msg91
MSG91_AUTHKEY=<your authkey>
MSG91_WA_NUMBER=<your integrated WhatsApp number, e.g. 918469876518>
MSG91_WA_TEMPLATE_ACK=iwp_booking_ack
MSG91_WA_TEMPLATE_OTP=iwp_action_link
MSG91_WA_TEMPLATE_ALERT=iwp_needs_attention
# Optional single fallback used if a per-type var is unset:
MSG91_WA_TEMPLATE=iwp_booking_ack
```

## Inbound webhook (delivery receipts + replies)
In the MSG91 (or Gupshup) console, set the **callback / webhook URL** to:
```
https://<your-domain>/api/webhooks/whatsapp?token=<WHATSAPP_WEBHOOK_SECRET>
```
Use the same value for `WHATSAPP_WEBHOOK_SECRET` in `.env.local`. The endpoint
updates `notifications.status` on delivery events and logs inbound replies.

## Notes on approval
- Keep the fixed (non-variable) wording meaningful — Meta rejects templates that are *only* a
  variable (e.g. a body of just `{{1}}`). The `Indian Waste Portal: {{1}}` frame satisfies this.
- Don't put OTP **codes** in a template — we never send the code; we send a **link** so the client
  types the OTP on their own screen. That keeps these UTILITY (not AUTHENTICATION) templates.
- Approval usually lands in minutes–hours. Until then, `NOTIFY_PROVIDER=log` keeps the app running
  with no external sends.
