import { NextResponse } from 'next/server';
import { getDb }        from '../../../../lib/d1-db';
import { requireUser } from '../../../../lib/client-auth';

/**
 * GET /api/account/me — the logged-in customer, their registrations, and invoices.
 * Ownership is enforced via organizations.user_id = session.userId.
 */
export async function GET(request) {
  try {
    const db = getDb(request);
    const full = await requireUser(request, db);
    if (!full) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = { id: full.id, email: full.email, full_name: full.full_name, phone: full.phone, email_verified: full.email_verified, created_at: full.created_at };
    const sess = { userId: full.id };

    const registrations = await db.all(`
      SELECT id, org_name, service_type, status, payment_token, category,
             balance_amount_paise, balance_invoice_url, ack_number, created_at
      FROM organizations WHERE user_id = ? ORDER BY created_at DESC
    `, [sess.userId]);

    const invoices = await db.all(`
      SELECT p.id, p.kind, p.status, p.amount_paise, p.razorpay_payment_id, p.paid_at, p.created_at,
             o.org_name
      FROM payments p JOIN organizations o ON o.id = p.org_id
      WHERE o.user_id = ? ORDER BY p.created_at DESC LIMIT 100
    `, [sess.userId]);

    return NextResponse.json({ user, registrations, invoices });
  } catch (err) {
    console.error('[/api/account/me]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
