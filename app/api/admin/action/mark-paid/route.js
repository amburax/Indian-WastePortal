import { NextResponse } from 'next/server';
import { getDb, Q }     from '../../../../../lib/d1-db';
import { getAdmin }     from '../../../../../lib/admin-auth';
import { writeAudit }   from '../../../../../lib/audit';

/**
 * POST /api/admin/action/mark-paid
 * Manually settle the balance (e.g. offline UPI / NEFT). Clears Gate 1 so the
 * org can be released to filing. Body: { orgId, note }
 */
export async function POST(request) {
  const admin = getAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { orgId, note = null } = await request.json();
    if (!orgId) return NextResponse.json({ error: 'orgId required' }, { status: 400 });

    const db  = getDb(request);
    const org = await db.get(...Q.getOrgById(orgId));
    if (!org) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await db.run(...Q.markPaymentVerified(orgId));
    await db.run(...Q.updateStatus('Paid', orgId));
    // If a balance payment row exists, mark it paid.
    await db.run("UPDATE payments SET status='paid', paid_at=datetime('now') WHERE org_id=? AND kind='balance' AND status!='paid'", [orgId]).catch(() => {});

    await writeAudit(db, { adminEmail: admin.email, orgId, action: 'mark_paid', meta: { note, manual: true } });
    return NextResponse.json({ ok: true, status: 'Paid' });
  } catch (err) {
    console.error('[admin/action/mark-paid]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
