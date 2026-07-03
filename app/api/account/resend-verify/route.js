import { NextResponse } from 'next/server';
import { getDb }        from '../../../../lib/d1-db';
import { requireUser, signVerify } from '../../../../lib/client-auth';
import { sendEmail, verifyEmail } from '../../../../lib/email';

/** POST /api/account/resend-verify — re-send the verification email (logged-in user). */
export async function POST(request) {
  try {
    const db = getDb(request);
    const user = await requireUser(request, db);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.email_verified) return NextResponse.json({ ok: true, alreadyVerified: true });

    const base = process.env.APP_BASE_URL || 'http://localhost:3000';
    const verifyUrl = `${base}/api/account/verify?token=${encodeURIComponent(signVerify(user.id))}`;
    try { await sendEmail({ to: user.email, ...verifyEmail({ verifyUrl }) }); } catch (e) { console.warn('[resend-verify]', e.message); }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[/api/account/resend-verify]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
