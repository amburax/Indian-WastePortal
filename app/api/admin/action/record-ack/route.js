import { NextResponse } from 'next/server';
import { getDb, Q }     from '../../../../../lib/d1-db';
import { getAdmin }     from '../../../../../lib/admin-auth';
import { writeAudit }   from '../../../../../lib/audit';

/**
 * POST /api/admin/action/record-ack
 * Manual filing: after a consultant files on the CPCB portal by hand, record the
 * acknowledgement number and mark the registration Completed. The client then
 * sees the ACK on their status page (same as the automated path).
 * Body: { orgId, ackNumber, portalStatus? }
 */
export async function POST(request) {
  const admin = getAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { orgId, ackNumber, portalStatus } = await request.json();
    if (!orgId) return NextResponse.json({ error: 'orgId required' }, { status: 400 });
    const ack = String(ackNumber || '').trim();
    if (ack.length < 4) return NextResponse.json({ error: 'Enter a valid ACK number' }, { status: 400 });

    const db  = getDb(request);
    const org = await db.get(...Q.getOrgById(orgId));
    if (!org) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await db.run(
      "UPDATE organizations SET ack_number = ?, portal_status = ?, status = 'Completed', completed_at = datetime('now') WHERE id = ?",
      [ack, String(portalStatus || 'Pending Verification at ULB').trim(), orgId]
    );
    await writeAudit(db, { adminEmail: admin.email, orgId, action: 'record_ack', meta: { ack } });
    return NextResponse.json({ ok: true, status: 'Completed', ack });
  } catch (err) {
    console.error('[admin/action/record-ack]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
