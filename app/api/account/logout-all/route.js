import { NextResponse } from 'next/server';
import { getDb }        from '../../../../lib/d1-db';
import { requireUser, CLIENT_COOKIE } from '../../../../lib/client-auth';

/** POST /api/account/logout-all — revoke every session for this account (incl. this one). */
export async function POST(request) {
  try {
    const db = getDb(request);
    const user = await requireUser(request, db);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await db.run('UPDATE users SET session_epoch = session_epoch + 1 WHERE id = ?', [user.id]);
    const res = NextResponse.json({ ok: true });
    res.cookies.set(CLIENT_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
    return res;
  } catch (err) {
    console.error('[/api/account/logout-all]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
