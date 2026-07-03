import { NextResponse }            from 'next/server';
import { getDb, Q }                from '../../../../../lib/d1-db';
import { getAdmin }                from '../../../../../lib/admin-auth';
import { writeAudit }              from '../../../../../lib/audit';
import { sendNotification }        from '../../../../../lib/notify';
import { createBalancePaymentLink } from '../../../../../lib/razorpay';
import { randomUUID }              from 'crypto';

/**
 * POST /api/admin/action/send-invoice
 * After the consultation, invoice the confirmed balance via a Razorpay Payment
 * Link and message it to the client. Moves the org to 'AwaitingPayment'.
 * Body: { orgId, amountRupees }
 */
export async function POST(request) {
  const admin = getAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { orgId, amountRupees } = await request.json();
    if (!orgId)        return NextResponse.json({ error: 'orgId required' }, { status: 400 });
    const amount = Math.round(Number(amountRupees) * 100);
    if (!amount || amount < 100) return NextResponse.json({ error: 'Valid amount (₹) required' }, { status: 400 });

    const db  = getDb(request);
    const org = await db.get(...Q.getOrgById(orgId));
    if (!org) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    // Single-payment model: this invoice is the full one-time fee (no retainer prerequisite).

    const link = await createBalancePaymentLink({
      amount, orgId, token: org.payment_token,
      name: org.org_name, email: org.email, phone: org.phone,
      description: `CPCB SWM filing — balance for ${org.org_name}`,
    });

    // Record the invoice on the org + a balance payment row.
    await db.run(
      `UPDATE organizations
       SET balance_amount_paise = ?, balance_invoice_url = ?, balance_payment_link_id = ?, status = 'AwaitingPayment'
       WHERE id = ?`,
      [amount, link.short_url, link.id, orgId]
    );
    await db.run(
      `INSERT INTO payments (id, org_id, razorpay_order_id, amount_paise, currency, kind, status)
       VALUES (?,?,?,?,?,?,?)`,
      [randomUUID(), orgId, link.id, amount, 'INR', 'balance', 'created']
    );

    const msg = `Your CPCB filing balance of ₹${(amount / 100).toLocaleString('en-IN')} is ready. Pay securely here: ${link.short_url}`;
    try { await sendNotification(db, { orgId, channel: 'whatsapp', type: 'otp_link', payload: msg }); } catch {}

    await writeAudit(db, { adminEmail: admin.email, orgId, action: 'send_invoice', meta: { amount, dev: !!link.dev } });
    return NextResponse.json({ ok: true, status: 'AwaitingPayment', invoiceUrl: link.short_url, dev: !!link.dev });
  } catch (err) {
    console.error('[admin/action/send-invoice]', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
