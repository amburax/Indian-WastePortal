import { NextResponse } from 'next/server';
import { getDb, Q }     from '../../../../lib/d1-db';
import { getQueueDepth } from '../../../../lib/queue';

/**
 * GET /api/queue/position?token=<payment_token>
 *
 * Returns the current queue position and ETA for a given org.
 * Called by QueueStatus.jsx every 15 seconds while status = 'Queued' or 'In Progress'.
 *
 * Response:
 * {
 *   status:      "Queued" | "In Progress" | "Completed" | ...
 *   position:    3,          // global position in queue
 *   jobs_ahead:  2,          // how many others are before them
 *   eta_minutes: 30,         // estimated wait time
 *   ack_number:  null | "SWM/BWG-I/GJ/2026/0000042"
 *   portal_status: null | "Pending Verification at ULB"
 * }
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token)
      return NextResponse.json({ error: 'token is required' }, { status: 400 });

    const db  = getDb(request);
    const org = await db.get(...Q.getOrgByToken(token));

    if (!org)
      return NextResponse.json({ error: 'Registration not found' }, { status: 404 });

    // Scrub sensitive fields
    const { password_hash, ...safeOrg } = org;

    let jobsAhead  = 0;
    let etaMinutes = 0;
    let job = null;

    // Fetch the latest job whenever one may exist (so the client can see OTP
    // attempts / lockout even in NeedsAttention), and compute queue depth only
    // for actively queued/in-progress orgs.
    if (org.queue_position) {
      job = await db.get(...Q.getJobByOrgId(org.id));
      if (['Queued', 'In Progress'].includes(org.status)) {
        const depth = await getQueueDepth(org.queue_position, db);
        jobsAhead  = depth.jobsAhead;
        etaMinutes = depth.etaMinutes;
      }
    }

    return NextResponse.json({
      status:        org.status,
      position:      org.queue_position,
      jobs_ahead:    jobsAhead,
      eta_minutes:   etaMinutes,
      ack_number:    org.ack_number,
      portal_status: org.portal_status,
      queued_at:     org.queued_at,
      completed_at:  org.completed_at,
      org:           safeOrg,
      job:           job ? {
        status:               job.status,
        captcha_image_base64: job.captcha_image_base64,
        otp_attempts:         job.otp_attempts || 0,
        otp_locked_until:     job.otp_locked_until || null,
      } : null
    });

  } catch (err) {
    console.error('[/api/queue/position] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
