import { NextResponse } from 'next/server';
import { getDb, Q }     from '../../../../lib/d1-db';

/**
 * GET /api/status/[token]
 * Returns full org status (safe — no password_hash).
 */
export async function GET(request, { params }) {
  try {
    const { token } = params;
    if (!token) return NextResponse.json({ error: 'Token required' }, { status: 400 });

    const db  = getDb(request);
    const org = await db.get(...Q.getOrgByToken(token));
    if (!org) return NextResponse.json({ error: 'Registration not found' }, { status: 404 });

    const metrics = await db.get(...Q.getMetricsByOrg(org.id));
    const address = await db.get(...Q.getAddressByOrg(org.id));
    const payment = await db.get(
      'SELECT status, amount_paise, razorpay_order_id, paid_at FROM payments WHERE org_id = ? ORDER BY created_at DESC LIMIT 1',
      [org.id]
    );

    // Scrub sensitive data
    const { password_hash, ...safeOrg } = org;

    return NextResponse.json({ org: safeOrg, metrics, address, payment });

  } catch (err) {
    console.error('[/api/status/:token]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
