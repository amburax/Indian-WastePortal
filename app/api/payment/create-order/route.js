import { NextResponse } from 'next/server';
import { getDb, Q }     from '../../../../lib/d1-db';
import { createOrder }  from '../../../../lib/razorpay';
import { randomUUID }   from 'crypto';
import { rateLimit, clientIp } from '../../../../lib/ratelimit';

/**
 * POST /api/payment/create-order
 * Body: { orgId, kind?: 'retainer'|'balance'|'full', plan? }
 *
 *  retainer → small booking fee (RETAINER_AMOUNT_PAISE) that unlocks the consultant call
 *  balance  → the confirmed balance the admin invoiced (org.balance_amount_paise)
 *  full     → legacy single plan payment
 */
const PLAN_AMOUNTS = {
  standard:     299900,    // ₹2,999
  professional: 749900,    // ₹7,499
  enterprise:   2499900,   // ₹24,999
};
const RETAINER_PAISE = parseInt(process.env.RETAINER_AMOUNT_PAISE || '49900', 10); // ₹499

export async function POST(request) {
  try {
    if ((await rateLimit(request, `createorder:${clientIp(request)}`, { max: 12, windowMs: 60_000 })).limited)
      return NextResponse.json({ error: 'Too many attempts — please wait a minute.' }, { status: 429 });

    let bodyJson;
    try { bodyJson = await request.json(); } catch { return NextResponse.json({ error: 'Invalid request body' }, { status: 400 }); }
    const { orgId, kind = 'full' } = bodyJson;
    if (!orgId) return NextResponse.json({ error: 'orgId is required' }, { status: 400 });

    const db  = getDb(request);
    const org = await db.get(...Q.getOrgById(orgId));
    if (!org) return NextResponse.json({ error: 'Organisation not found' }, { status: 404 });

    // Pricing is ALWAYS server-authoritative — derived from the org's stored plan
    // or the admin-set balance, never from a client-supplied amount or plan.
    let amount;
    if (kind === 'retainer')     amount = RETAINER_PAISE;
    else if (kind === 'balance') amount = org.balance_amount_paise || (PLAN_AMOUNTS[org.plan] || PLAN_AMOUNTS.standard);
    else                         amount = PLAN_AMOUNTS[org.plan] || PLAN_AMOUNTS.standard;

    const order = await createOrder({ amount, orgId, kind });

    await db.run(
      `INSERT INTO payments (id, org_id, razorpay_order_id, amount_paise, currency, kind)
       VALUES (?,?,?,?,?,?)`,
      [randomUUID(), orgId, order.id, amount, 'INR', kind]
    );

    return NextResponse.json({ orderId: order.id, amount: order.amount, currency: order.currency, kind, dev: !!order._dev });
  } catch (err) {
    console.error('[/api/payment/create-order]', err);
    return NextResponse.json({ error: err.message || 'Failed to create order' }, { status: 500 });
  }
}
