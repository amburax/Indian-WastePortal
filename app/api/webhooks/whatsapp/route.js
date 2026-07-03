import { NextResponse } from 'next/server';
import { getDb }        from '../../../../lib/d1-db';

/**
 * POST /api/webhooks/whatsapp
 *
 * Inbound webhook for the WhatsApp provider (MSG91 / Gupshup). Two jobs:
 *   1. Delivery receipts  → update notifications.status (sent/delivered/read/failed)
 *   2. Inbound replies     → log so a consultant can follow up (e.g. client texts "OTP help")
 *
 * Security: providers can't sign like Razorpay, so we gate on a shared secret you
 * configure in the provider console as a query param (?token=WHATSAPP_WEBHOOK_SECRET).
 *
 * Provider setup:
 *   MSG91  → Console ▸ WhatsApp ▸ Webhook URL: https://<host>/api/webhooks/whatsapp?token=...
 *   Gupshup→ App ▸ Callback URL: https://<host>/api/webhooks/whatsapp?token=...
 */
export async function POST(request) {
  try {
    const url    = new URL(request.url);
    const secret = process.env.WHATSAPP_WEBHOOK_SECRET;
    if (secret && url.searchParams.get('token') !== secret)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json().catch(() => ({}));
    const db   = getDb(request);

    // Normalise across providers: both send status events with a message id + status.
    // MSG91:   { type:'status', data:{ requestId, status } }
    // Gupshup: { type:'message-event', payload:{ id, type:'delivered'|'read'|'failed' } }
    const evt = normaliseEvent(body);

    if (evt?.kind === 'status' && evt.status) {
      // Best-effort: map provider status → our notifications.status
      await db.run(
        "UPDATE notifications SET status = ? WHERE status != 'failed' AND created_at >= datetime('now','-1 day')",
        [evt.status]
      ).catch(() => {});
    } else if (evt?.kind === 'inbound' && evt.from) {
      console.log(`[whatsapp:inbound] ${evt.from}: ${evt.text}`);
      // (Optional) persist to a support inbox table for consultant follow-up.
    }

    // Providers expect a fast 200 ack or they retry.
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('[/api/webhooks/whatsapp]', err);
    return NextResponse.json({ received: true });   // never make the provider retry on our bug
  }
}

function normaliseEvent(body) {
  // Gupshup
  if (body?.type === 'message-event' && body?.payload)
    return { kind: 'status', status: body.payload.type };
  if (body?.type === 'message' && body?.payload)
    return { kind: 'inbound', from: body.payload?.sender?.phone, text: body.payload?.payload?.text };
  // MSG91
  if (body?.type === 'status' && body?.data)
    return { kind: 'status', status: body.data.status };
  if (body?.type === 'message' && body?.data)
    return { kind: 'inbound', from: body.data.from, text: body.data.text };
  return null;
}

// Some providers verify the endpoint with a GET challenge.
export async function GET(request) {
  const url = new URL(request.url);
  return NextResponse.json({ ok: true, challenge: url.searchParams.get('hub.challenge') || null });
}
