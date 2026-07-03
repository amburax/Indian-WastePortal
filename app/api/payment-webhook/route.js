import { NextResponse }              from 'next/server';
import { getDb, Q }                  from '../../../lib/d1-db';
import { sendNotification }          from '../../../lib/notify';
import { createHmac }                from 'crypto';

/**
 * POST /api/payment-webhook
 *
 * Handles two scenarios:
 *  1. Razorpay Dashboard Webhook (server-to-server) — verifies X-Razorpay-Signature
 *  2. Client-side payment verify (header: x-razorpay-client-verify: true)
 *
 * After payment is verified:
 *  → Updates org status: New → Paid
 *  → Gets next queue position (CF KV atomic counter)
 *  → Pushes job to Cloudflare Queue (or marks as Queued in local DB)
 *  → Updates org status: Paid → Queued
 *  → Returns queue position to frontend
 */
export async function POST(request) {
  const isClientVerify = request.headers.get('x-razorpay-client-verify') === 'true';

  try {
    // Read raw body text first — needed for Razorpay HMAC verification.
    // JSON.stringify(parsedBody) will not reproduce the exact bytes Razorpay signed.
    const rawBody = await request.text();
    const body    = JSON.parse(rawBody);
    const db      = getDb(request);

    // Extract Cloudflare env bindings if running on Workers
    const cfEnv = request.cf?.env || null;

    if (isClientVerify) {
      return await handleClientVerify(body, db, cfEnv);
    } else {
      return await handleWebhook(request, body, rawBody, db, cfEnv);
    }

  } catch (err) {
    console.error('[/api/payment-webhook] Fatal:', err);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

// ── Scenario 1: Razorpay Dashboard Webhook ────────────────────
async function handleWebhook(request, payload, rawBody, db, cfEnv) {
  const signature = request.headers.get('x-razorpay-signature') || '';
  const secret    = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!secret) {
    console.error('[Webhook] RAZORPAY_WEBHOOK_SECRET not configured');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }

  // HMAC must be computed over the exact raw bytes Razorpay sent, not re-serialized JSON
  const expectedSig = createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  if (signature !== expectedSig) {
    console.warn('[Webhook] Signature mismatch — possible spoofed request');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const event     = payload?.event;
  const orderId   = payload?.payload?.payment?.entity?.order_id
    || payload?.payload?.order?.entity?.id;
  const paymentId = payload?.payload?.payment?.entity?.id;

  if ((event === 'payment.captured' || event === 'order.paid') && orderId) {
    const r = await processPayment({ orderId, paymentId, signature, webhookPayload: JSON.stringify(payload), db, cfEnv });
    return NextResponse.json({ received: true, ...r });
  }

  if (event === 'payment_link.paid') {
    const ent = payload?.payload?.payment_link?.entity;
    await processBalanceLink({
      plinkId:   ent?.id,
      orgIdNote: ent?.notes?.org_id,
      paymentId,
      webhookPayload: JSON.stringify(payload),
      db,
    });
    return NextResponse.json({ received: true, event });
  }

  return NextResponse.json({ received: true, event });
}

// ── Scenario 2: Client-side verify (from PaymentButton.jsx) ───
async function handleClientVerify(body, db, cfEnv) {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature)
    return NextResponse.json({ error: 'Missing payment fields' }, { status: 400 });

  // Verify HMAC signature
  const secret      = process.env.RAZORPAY_KEY_SECRET;
  const expectedSig = createHmac('sha256', secret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  if (expectedSig !== razorpay_signature)
    return NextResponse.json({ error: 'Payment signature verification failed' }, { status: 400 });

  const { orgId, kind } = await processPayment({
    orderId:       razorpay_order_id,
    paymentId:     razorpay_payment_id,
    signature:     razorpay_signature,
    webhookPayload: null,
    db, cfEnv,
  });

  return NextResponse.json({
    verified: true,
    orgId,
    kind,
    message: kind === 'retainer'
      ? 'Booking confirmed! Our consultant will call you within 24 hours.'
      : 'Payment verified! Our team will initiate your filing shortly.',
  });
}

async function notifySafe(db, orgId, type, payload) {
  try { await sendNotification(db, { orgId, channel: 'whatsapp', type, payload }); }
  catch (e) { console.warn('[payment] notify failed (non-fatal):', e.message); }
}

// ── Core: process a captured payment, branching on its kind ──────
//   retainer → unlocks the consultant call (does NOT verify for filing)
//   balance|full → marks payment_verified + status Paid (Gate 1 cleared)
// Filing still only starts when an admin presses Start Filing (Gate 2).
async function processPayment({ orderId, paymentId, signature, webhookPayload, db, cfEnv }) {
  // Idempotency — Razorpay retries webhooks. If this order is already settled, skip.
  const existing = await db.get(...Q.getPaymentByOrderId(orderId));
  if (existing?.status === 'paid') {
    console.log(`↩ [Payment] duplicate webhook for ${orderId} — already paid, skipping`);
    return { orgId: existing.org_id, kind: existing.kind || 'full', duplicate: true };
  }

  await db.run(...Q.updatePaymentSuccess(paymentId, signature, webhookPayload, orderId));

  const payment = existing || await db.get(...Q.getPaymentByOrderId(orderId));
  if (!payment?.org_id) throw new Error(`No org found for order ${orderId}`);
  const orgId = payment.org_id;
  const kind  = payment.kind || 'full';

  if (kind === 'retainer') {
    // Booking fee → move New → UnderReview, flag retainer_paid. No filing yet.
    await db.run(
      "UPDATE organizations SET retainer_paid = 1, status = CASE WHEN status = 'New' THEN 'UnderReview' ELSE status END WHERE id = ?",
      [orgId]
    );
    await notifySafe(db, orgId, 'submission_ack',
      'Booking confirmed. Our consultant will call you within 24 hours to schedule your CPCB filing.');
    console.log(`✅ [Payment] Org ${orgId} retainer paid — UnderReview`);
    return { orgId, kind };
  }

  // balance | full → clear Gate 1
  await db.run(...Q.markPaymentVerified(orgId));
  await db.run(...Q.updateStatus('Paid', orgId));
  await notifySafe(db, orgId, 'submission_ack',
    'Payment received. Our team will initiate your CPCB filing shortly.');
  console.log(`✅ [Payment] Org ${orgId} ${kind} paid — Paid (awaiting Start Filing)`);
  return { orgId, kind };
}

// ── Balance paid via a Razorpay Payment Link ────────────────────
async function processBalanceLink({ plinkId, orgIdNote, paymentId, webhookPayload, db }) {
  let orgId = orgIdNote || null;
  if (!orgId && plinkId) {
    const row = await db.get('SELECT id FROM organizations WHERE balance_payment_link_id = ?', [plinkId]);
    orgId = row?.id || null;
  }
  if (!orgId) throw new Error('payment_link.paid: could not resolve org');

  // Idempotency — skip if the balance invoice is already settled.
  const bal = await db.get("SELECT status FROM payments WHERE org_id=? AND kind='balance' ORDER BY created_at DESC LIMIT 1", [orgId]);
  if (bal?.status === 'paid') { console.log(`↩ [Payment] duplicate payment_link.paid for ${orgId} — skipping`); return; }

  await db.run(
    "UPDATE payments SET status='paid', razorpay_payment_id=?, paid_at=datetime('now'), webhook_payload=? WHERE org_id=? AND kind='balance'",
    [paymentId || null, webhookPayload || null, orgId]
  ).catch(() => {});
  await db.run(...Q.markPaymentVerified(orgId));
  await db.run(...Q.updateStatus('Paid', orgId));
  await notifySafe(db, orgId, 'submission_ack',
    'Balance payment received. Our team will initiate your CPCB filing shortly.');
  console.log(`✅ [Payment] Org ${orgId} balance link paid — Paid`);
}
