import { NextResponse } from 'next/server';
import { getDb }     from '../../../../../lib/d1-db';
import { getAdmin }  from '../../../../../lib/admin-auth';
import { writeAudit } from '../../../../../lib/audit';

const ALLOWED = new Set([
  'New', 'UnderReview', 'Paid', 'Scheduled', 'AwaitingPayment', 'Queued', 'In Progress',
  'Completed', 'NeedsAttention', 'Failed', 'Rejected', 'Cancelled',
]);

/**
 * POST /api/admin/action/set-status
 * Manual status override for edge cases. Body: { orgId, status, note }
 */
export async function POST(request) {
  const admin = getAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { orgId, status, note = null } = await request.json();
    if (!orgId || !status) return NextResponse.json({ error: 'orgId and status required' }, { status: 400 });
    if (!ALLOWED.has(status)) return NextResponse.json({ error: `Invalid status '${status}'` }, { status: 400 });

    const db  = getDb(request);
    const org = await db.get('SELECT id FROM organizations WHERE id = ?', [orgId]);
    if (!org) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await db.run('UPDATE organizations SET status = ? WHERE id = ?', [status, orgId]);
    await writeAudit(db, { adminEmail: admin.email, orgId, action: 'set_status', meta: { status, note } });
    return NextResponse.json({ ok: true, status });
  } catch (err) {
    console.error('[admin/action/set-status]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
