import { NextResponse } from 'next/server';
import { getDb }        from '../../../../lib/d1-db';
import { hashPassword, verifyPassword, isLegacyHash, signToken, ADMIN_COOKIE, SESSION_TTL_SEC } from '../../../../lib/admin-auth';
import { verifyTOTP } from '../../../../lib/totp';
import { randomUUID }   from 'crypto';

export async function POST(request) {
  try {
    const { email, password, token } = await request.json();
    if (!email || !password)
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });

    const db    = getDb(request);
    const admin = await db.get('SELECT * FROM admin_users WHERE email = ?', [email.toLowerCase().trim()]);

    if (!admin || !verifyPassword(password, admin.password_hash))
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });

    // Second factor: if this admin has 2FA on, a valid TOTP code is required.
    if (admin.totp_enabled) {
      if (!token) return NextResponse.json({ needs2fa: true }, { status: 200 });
      if (!verifyTOTP(admin.totp_secret, token))
        return NextResponse.json({ needs2fa: true, error: 'Invalid authentication code' }, { status: 401 });
    }

    // Upgrade legacy sha256 hashes to scrypt on successful login.
    if (isLegacyHash(admin.password_hash)) {
      try { await db.run('UPDATE admin_users SET password_hash = ? WHERE id = ?', [hashPassword(password), admin.id]); } catch {}
    }

    // audit
    try {
      await db.run('INSERT INTO audit_log (id, admin_email, action) VALUES (?,?,?)',
        [randomUUID(), admin.email, 'login']);
    } catch { /* non-fatal */ }

    const res = NextResponse.json({ ok: true, email: admin.email, role: admin.role });
    res.cookies.set(ADMIN_COOKIE, signToken(admin.email), {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_TTL_SEC,
      secure: process.env.NODE_ENV === 'production',
    });
    return res;
  } catch (err) {
    console.error('[/api/admin/login]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
