import { NextResponse } from 'next/server';
import { getDb }    from '../../../../../lib/d1-db';
import { getAdmin } from '../../../../../lib/admin-auth';

export async function GET(request, { params }) {
  const admin = getAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = params;
    const db = getDb(request);

    const org = await db.get('SELECT * FROM organizations WHERE id = ?', [id]);
    if (!org) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const { password_hash, ...safeOrg } = org;

    const metrics = await db.get('SELECT * FROM metrics       WHERE org_id = ?', [id]);
    const address = await db.get('SELECT * FROM lgd_addresses WHERE org_id = ?', [id]);
    const job     = await db.get('SELECT id, status, attempt_count, otp_attempts, otp_locked_until, last_error, created_at, started_at, completed_at FROM queue_jobs WHERE org_id = ? ORDER BY created_at DESC LIMIT 1', [id]);
    const payment = await db.get('SELECT status, amount_paise, razorpay_payment_id, paid_at FROM payments WHERE org_id = ? ORDER BY created_at DESC LIMIT 1', [id]);
    const logs    = await db.all('SELECT step, status, message, created_at FROM agent_logs WHERE org_id = ? ORDER BY created_at DESC LIMIT 60', [id]);

    return NextResponse.json({ org: safeOrg, metrics, address, job, payment, logs });
  } catch (err) {
    console.error('[/api/admin/submission/[id]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
