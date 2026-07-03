import { NextResponse } from 'next/server';
import { getDb }     from '../../../../../lib/d1-db';
import { getAdmin }  from '../../../../../lib/admin-auth';
import { writeAudit } from '../../../../../lib/audit';

/**
 * POST /api/admin/action/reset-otp
 * Clears OTP lockout/attempts and re-releases the job so the worker re-runs and
 * triggers a fresh OTP. Use after a NeedsAttention / Failed lockout.
 * Body: { orgId }
 */
export async function POST(request) {
  const admin = getAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { orgId } = await request.json();
    if (!orgId) return NextResponse.json({ error: 'orgId required' }, { status: 400 });

    const db  = getDb(request);
    const org = await db.get('SELECT id, status FROM organizations WHERE id = ?', [orgId]);
    if (!org) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const job = await db.get(
      'SELECT id FROM queue_jobs WHERE org_id = ? ORDER BY created_at DESC LIMIT 1', [orgId]);
    if (!job) return NextResponse.json({ error: 'No filing job to reset' }, { status: 409 });

    // Clean slate: clear OTP accounting + agent retries, re-arm the job.
    await db.run(
      `UPDATE queue_jobs
       SET otp_attempts = 0, otp_locked_until = NULL, otp_input = NULL,
           captcha_text_input = NULL, attempt_count = 0, last_error = NULL,
           status = 'pending'
       WHERE id = ?`,
      [job.id]
    );
    // Put the org back in the worker's pickup set.
    await db.run("UPDATE organizations SET status = 'Queued' WHERE id = ?", [orgId]);

    await writeAudit(db, { adminEmail: admin.email, orgId, action: 'reset_otp', meta: { jobId: job.id } });
    return NextResponse.json({ ok: true, status: 'Queued' });
  } catch (err) {
    console.error('[admin/action/reset-otp]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
