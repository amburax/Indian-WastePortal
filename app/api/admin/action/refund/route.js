import { NextResponse } from 'next/server';
import { getDb }       from '../../../../../lib/d1-db';
import { getAdmin, getAdminRole } from '../../../../../lib/admin-auth';
import { writeAudit }  from '../../../../../lib/audit';
import { refundPayment } from '../../../../../lib/razorpay';

/**
 * POST /api/admin/action/refund — issue a Razorpay refund for an org's captured
 * payment and record it. Superadmin-only (money out). Body:
 *   { orgId, amountRupees?, reason? }   (amountRupees omitted = full refund)
 */
export async function POST(request) {
  const admin = getAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { orgId, amountRupees, reason } = await request.json();
    if (!orgId) return NextResponse.json({ error: 'orgId required' }, { status: 400 });

    const db = getDb(request);
    if ((await getAdminRole(db, admin.email)) !== 'superadmin')
      return NextResponse.json({ error: 'Superadmin role required' }, { status: 403 });

    // Most recent captured payment that carries a Razorpay payment id.
    const pay = await db.get(
      "SELECT * FROM payments WHERE org_id = ? AND status = 'paid' AND razorpay_payment_id IS NOT NULL ORDER BY created_at DESC LIMIT 1",
      [orgId]
    );
    if (!pay) return NextResponse.json({ error: 'No captured payment to refund' }, { status: 404 });
    if (pay.refund_id) return NextResponse.json({ error: 'This payment has already been refunded' }, { status: 400 });

    const maxPaise = pay.amount_paise;
    const paise = amountRupees != null && amountRupees !== '' ? Math.round(Number(amountRupees) * 100) : maxPaise;
    if (!paise || paise < 100 || paise > maxPaise)
      return NextResponse.json({ error: `Refund must be between ₹1 and ₹${(maxPaise / 100).toLocaleString('en-IN')}` }, { status: 400 });

    const refund = await refundPayment({
      paymentId: pay.razorpay_payment_id,
      amount: paise,
      notes: { org_id: orgId, reason: reason || '', by: admin.email },
    });

    await db.run(
      "UPDATE payments SET refund_id = ?, refund_amount_paise = ?, refund_status = ?, refunded_at = datetime('now') WHERE id = ?",
      [refund.id, paise, refund.status || 'processed', pay.id]
    );
    // Timestamped note so the refund is visible in the org's history.
    const note = `\n[${new Date().toISOString().slice(0, 10)}] Refund ₹${(paise / 100).toLocaleString('en-IN')} issued by ${admin.email}${reason ? ' — ' + reason : ''}`;
    await db.run("UPDATE organizations SET consultant_notes = COALESCE(consultant_notes, '') || ? WHERE id = ?", [note, orgId]);
    await writeAudit(db, { adminEmail: admin.email, orgId, action: 'refund', meta: { paymentId: pay.razorpay_payment_id, paise, refundId: refund.id, reason } });

    return NextResponse.json({ ok: true, refundId: refund.id, amountPaise: paise, status: refund.status });
  } catch (err) {
    console.error('[admin/action/refund]', err);
    return NextResponse.json({ error: err?.error?.description || 'Refund failed' }, { status: 500 });
  }
}
