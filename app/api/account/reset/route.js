import { NextResponse } from 'next/server';
import { getDb }        from '../../../../lib/d1-db';
import { verifyReset, hashPassword, signToken, CLIENT_COOKIE, sessionCookieOptions } from '../../../../lib/client-auth';

/**
 * POST /api/account/reset  { token, password }
 * Verifies the reset token, sets the new password, and logs the user in.
 */
export async function POST(request) {
  try {
    const { token, password } = await request.json();
    if (!token || !password) return NextResponse.json({ error: 'Token and password required' }, { status: 400 });
    if (String(password).length < 8) return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });

    const sess = verifyReset(token);
    if (!sess) return NextResponse.json({ error: 'This reset link is invalid or has expired.' }, { status: 400 });

    const db = getDb(request);
    const user = await db.get('SELECT id, email, session_epoch FROM users WHERE id = ?', [sess.userId]);
    if (!user) return NextResponse.json({ error: 'Account not found' }, { status: 404 });

    // Bump the session epoch → all previously-issued sessions are revoked.
    const newEpoch = (user.session_epoch || 0) + 1;
    await db.run('UPDATE users SET password_hash = ?, session_epoch = ? WHERE id = ?', [hashPassword(password), newEpoch, user.id]);

    const res = NextResponse.json({ ok: true, email: user.email });
    res.cookies.set(CLIENT_COOKIE, signToken(user.id, newEpoch), sessionCookieOptions());
    return res;
  } catch (err) {
    console.error('[/api/account/reset]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
