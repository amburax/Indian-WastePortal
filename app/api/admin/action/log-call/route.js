import { NextResponse } from 'next/server';
import { getDb }     from '../../../../../lib/d1-db';
import { getAdmin }  from '../../../../../lib/admin-auth';
import { writeAudit } from '../../../../../lib/audit';

/**
 * POST /api/admin/action/log-call
 * Records a consultant call + appointment, moves Paid → Scheduled.
 * Body: { orgId, appointment_at, consultant_notes }
 */
export async function POST(request) {
  const admin = getAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { orgId, appointment_at = null, consultant_notes = null } = await request.json();
    if (!orgId) return NextResponse.json({ error: 'orgId required' }, { status: 400 });

    const db  = getDb(request);
    const org = await db.get('SELECT id, status FROM organizations WHERE id = ?', [orgId]);
    if (!org) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    // No upfront retainer — a consultant can log a call on any live registration.

    await db.run(
      `UPDATE organizations
       SET appointment_at = ?, consultant_notes = ?, assigned_admin = ?, status = 'Scheduled'
       WHERE id = ?`,
      [appointment_at, consultant_notes, admin.email, orgId]
    );

    await writeAudit(db, { adminEmail: admin.email, orgId, action: 'log_call', meta: { appointment_at } });
    return NextResponse.json({ ok: true, status: 'Scheduled' });
  } catch (err) {
    console.error('[admin/action/log-call]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
