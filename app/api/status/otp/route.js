import { NextResponse } from 'next/server';
import { getDb, Q }     from '../../../../lib/d1-db';
import { rateLimit }    from '../../../../lib/ratelimit';

/**
 * POST /api/status/otp
 * The client shares the CPCB OTP (manual-filing relay). Body: { token, otp }.
 * The consultant reads it from the admin console. The OTP is never logged.
 */
export async function POST(request) {
  try {
    const { token, otp } = await request.json();
    if (!token || !otp) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

    const code = String(otp).replace(/\s/g, '');
    if (!/^\d{4,8}$/.test(code)) return NextResponse.json({ error: 'Enter the numeric OTP from your SMS' }, { status: 400 });

    if (rateLimit(`statusotp:${token}`, { max: 10, windowMs: 60_000 }).limited)
      return NextResponse.json({ error: 'Too many attempts — please wait a minute.' }, { status: 429 });

    const db  = getDb(request);
    const org = await db.get(...Q.getOrgByToken(token));
    if (!org) return NextResponse.json({ error: 'Registration not found' }, { status: 404 });

    await db.run("UPDATE organizations SET manual_otp = ?, manual_otp_at = datetime('now') WHERE id = ?", [code, org.id]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[/api/status/otp]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
