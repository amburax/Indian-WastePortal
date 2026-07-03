import { NextResponse } from 'next/server';
import { getDb }        from '../../../../lib/d1-db';
import { signReset }    from '../../../../lib/client-auth';
import { sendEmail, resetPasswordEmail } from '../../../../lib/email';

/**
 * POST /api/account/forgot  { email }
 * Emails a password-reset link. Neutral response (won't reveal which emails exist).
 */
export async function POST(request) {
  const neutral = NextResponse.json({ ok: true, message: 'If that email has an account, we’ve sent a reset link.' });
  try {
    const { email } = await request.json();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return neutral;

    const db = getDb(request);
    const user = await db.get('SELECT id, email FROM users WHERE email = ?', [email.toLowerCase().trim()]);
    if (!user) return neutral;

    const base = process.env.APP_BASE_URL || 'http://localhost:3000';
    const resetUrl = `${base}/reset?token=${encodeURIComponent(signReset(user.id))}`;
    try { await sendEmail({ to: user.email, ...resetPasswordEmail({ resetUrl }) }); }
    catch (e) { console.warn('[forgot] email failed:', e.message); }

    return neutral;
  } catch (err) {
    console.error('[/api/account/forgot]', err);
    return neutral;
  }
}
