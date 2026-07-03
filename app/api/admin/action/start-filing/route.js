import { NextResponse }   from 'next/server';
import { getDb }          from '../../../../../lib/d1-db';
import { getAdmin }       from '../../../../../lib/admin-auth';
import { writeAudit }     from '../../../../../lib/audit';
import { releaseToQueue } from '../../../../../lib/admin-actions';

/**
 * POST /api/admin/action/start-filing
 * Gate 2: releases a PAID org to the worker queue. Filing begins next worker poll.
 * Body: { orgId }
 * Precondition: payment verified AND status in (Paid, Scheduled).
 */
export async function POST(request) {
  const admin = getAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { orgId } = await request.json();
    if (!orgId) return NextResponse.json({ error: 'orgId required' }, { status: 400 });

    const db  = getDb(request);
    const org = await db.get('SELECT * FROM organizations WHERE id = ?', [orgId]);
    if (!org) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Gate 1 enforcement: payment must be verified.
    if (!org.payment_verified)
      return NextResponse.json({ error: 'Payment not verified — cannot start filing' }, { status: 409 });
    if (!['Paid', 'Scheduled'].includes(org.status))
      return NextResponse.json({ error: `Cannot start filing from status '${org.status}'` }, { status: 409 });

    const cfEnv = request.cf?.env || null;
    const { queuePos, jobId } = await releaseToQueue(db, org, cfEnv);

    await writeAudit(db, { adminEmail: admin.email, orgId, action: 'start_filing', meta: { queuePos, jobId } });
    return NextResponse.json({ ok: true, status: 'Queued', queuePos });
  } catch (err) {
    console.error('[admin/action/start-filing]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
