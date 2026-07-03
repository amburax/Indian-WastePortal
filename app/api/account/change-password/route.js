import { NextResponse } from 'next/server';
import { getDb }        from '../../../../lib/d1-db';
import { requireUser, verifyPassword, hashPassword, signToken, CLIENT_COOKIE, sessionCookieOptions } from '../../../../lib/client-auth';

/**
 * POST /api/account/change-password { currentPassword, newPassword }
 * Verifies the current password, sets the new one, and bumps the session epoch
 * (revoking all other devices) while keeping the current device signed in.
 */
export async function POST(request) {
  try {
    const db = getDb(request);
    const user = await requireUser(request, db);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { currentPassword, newPassword } = await request.json();
    if (!newPassword || String(newPassword).length < 8)
      return NextResponse.json({ error: 'New password must be at least 8 characters' }, { status: 400 });
    if (!user.password_hash || !verifyPassword(currentPassword, user.password_hash))
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 });

    const newEpoch = (user.session_epoch || 0) + 1;
    await db.run('UPDATE users SET password_hash = ?, session_epoch = ? WHERE id = ?', [hashPassword(newPassword), newEpoch, user.id]);

    const res = NextResponse.json({ ok: true });
    res.cookies.set(CLIENT_COOKIE, signToken(user.id, newEpoch), sessionCookieOptions());
    return res;
  } catch (err) {
    console.error('[/api/account/change-password]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
