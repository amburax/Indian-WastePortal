import { NextResponse } from 'next/server';
import { getDb }       from '../../../../lib/d1-db';
import { hashPassword, verifyPassword, isLegacyHash, signToken, CLIENT_COOKIE, sessionCookieOptions } from '../../../../lib/client-auth';
import { rateLimit, clientIp } from '../../../../lib/ratelimit';

export async function POST(request) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    if (rateLimit(`login:${clientIp(request)}:${email.toLowerCase().trim()}`, { max: 8, windowMs: 60_000 }).limited)
      return NextResponse.json({ error: 'Too many attempts — please wait a minute.' }, { status: 429 });

    const db = getDb(request);
    const user = await db.get('SELECT id, email, password_hash, session_epoch FROM users WHERE email = ?', [email.toLowerCase().trim()]);
    if (!user || !user.password_hash || !verifyPassword(password, user.password_hash))
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });

    if (isLegacyHash(user.password_hash)) {
      try { await db.run('UPDATE users SET password_hash = ? WHERE id = ?', [hashPassword(password), user.id]); } catch {}
    }

    const res = NextResponse.json({ ok: true, email: user.email });
    res.cookies.set(CLIENT_COOKIE, signToken(user.id, user.session_epoch || 0), sessionCookieOptions());
    return res;
  } catch (err) {
    console.error('[/api/account/login]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
