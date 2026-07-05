import { NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { getDb }      from '../../../../lib/d1-db';
import { getAdmin, verifyPassword } from '../../../../lib/admin-auth';
import { generateSecret, verifyTOTP, otpauthURL } from '../../../../lib/totp';
import { writeAudit } from '../../../../lib/audit';

/**
 * Two-factor auth (TOTP) for the logged-in admin's own account.
 *   GET               → { enabled }
 *   POST {action:'setup'}          → { secret, otpauth, qr }  (stores a pending secret)
 *   POST {action:'enable', token}  → verifies the code, turns 2FA on
 *   POST {action:'disable', token|password} → turns 2FA off + clears the secret
 */
export async function GET(request) {
  const admin = getAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const db = getDb(request);
  const row = await db.get('SELECT totp_enabled FROM admin_users WHERE email = ?', [admin.email]);
  return NextResponse.json({ enabled: !!row?.totp_enabled });
}

export async function POST(request) {
  const admin = getAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const db = getDb(request);
    const me = await db.get('SELECT * FROM admin_users WHERE email = ?', [admin.email]);
    if (!me) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const { action, token, password } = await request.json();

    if (action === 'setup') {
      if (me.totp_enabled) return NextResponse.json({ error: '2FA is already enabled — disable it first to re-enrol.' }, { status: 400 });
      const secret = generateSecret();
      await db.run('UPDATE admin_users SET totp_secret = ?, totp_enabled = 0 WHERE email = ?', [secret, admin.email]);
      const otpauth = otpauthURL(secret, admin.email);
      const qr = await QRCode.toDataURL(otpauth, { margin: 1, width: 200 });
      return NextResponse.json({ secret, otpauth, qr });
    }

    if (action === 'enable') {
      if (!me.totp_secret) return NextResponse.json({ error: 'Start setup first.' }, { status: 400 });
      if (!verifyTOTP(me.totp_secret, token)) return NextResponse.json({ error: 'Invalid code — check your authenticator and try again.' }, { status: 400 });
      await db.run('UPDATE admin_users SET totp_enabled = 1 WHERE email = ?', [admin.email]);
      await writeAudit(db, { adminEmail: admin.email, action: '2fa_enabled' });
      return NextResponse.json({ ok: true, enabled: true });
    }

    if (action === 'disable') {
      const ok = (password && verifyPassword(password, me.password_hash)) ||
                 (token && me.totp_secret && verifyTOTP(me.totp_secret, token));
      if (!ok) return NextResponse.json({ error: 'Enter your password or a current 6-digit code to disable 2FA.' }, { status: 400 });
      await db.run('UPDATE admin_users SET totp_secret = NULL, totp_enabled = 0 WHERE email = ?', [admin.email]);
      await writeAudit(db, { adminEmail: admin.email, action: '2fa_disabled' });
      return NextResponse.json({ ok: true, enabled: false });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    console.error('[admin/2fa]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
