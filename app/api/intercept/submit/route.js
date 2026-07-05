import { NextResponse } from 'next/server';
import { getDb, Q }     from '../../../../lib/d1-db';
import { rateLimit }    from '../../../../lib/ratelimit';
import { reportError }  from '../../../../lib/observability';

/**
 * POST /api/intercept/submit
 *
 * Receives the OTP and CAPTCHA from the client's intercept modal and hands them
 * to the Playwright worker (which validates against CPCB). Enforces the
 * 3-attempt lockout and a lightweight rate-limit. The OTP value is never logged.
 */
const MAX_OTP_ATTEMPTS = 3;

function isFuture(sqlTs) {
  if (!sqlTs) return false;
  const iso = sqlTs.includes('T') ? sqlTs : sqlTs.replace(' ', 'T') + 'Z';
  const ms  = Date.parse(iso);
  return !Number.isNaN(ms) && ms > Date.now();
}

export async function POST(request) {
  try {
    const { token, otp, captchaText } = await request.json();
    if (!token || !otp || !captchaText)
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });

    if ((await rateLimit(request, `otp:${token}`, { max: 5, windowMs: 60_000 })).limited)
      return NextResponse.json({ error: 'Too many attempts — please wait a minute.' }, { status: 429 });

    const db  = getDb(request);
    const org = await db.get(...Q.getOrgByToken(token));
    if (!org) return NextResponse.json({ error: 'Org not found' }, { status: 404 });

    const job = await db.get(...Q.getJobByOrgId(org.id));
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

    // Lockout: either an explicit lock timestamp, or attempts exhausted.
    if (isFuture(job.otp_locked_until))
      return NextResponse.json(
        { error: 'OTP verification is temporarily locked. Our consultant will contact you shortly.', lockedUntil: job.otp_locked_until },
        { status: 423 });
    if ((job.otp_attempts || 0) >= MAX_OTP_ATTEMPTS)
      return NextResponse.json(
        { error: 'Maximum OTP attempts reached. Our consultant will contact you shortly.' },
        { status: 423 });

    // Hand off to the worker; the agent resumes and validates against CPCB.
    await db.run(...Q.updateJobIntercept(otp, captchaText, job.id));

    const attemptsLeft = Math.max(0, MAX_OTP_ATTEMPTS - (job.otp_attempts || 0));
    return NextResponse.json({ success: true, attemptsLeft });

  } catch (err) {
    reportError(err, { route: 'POST /api/intercept/submit' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
