import { NextResponse } from 'next/server';
import { getDb }        from '../../../../lib/d1-db';
import { verifyVerify } from '../../../../lib/client-auth';

/**
 * GET /api/account/verify?token=… — confirm email ownership, then redirect to
 * the dashboard. (GET so the emailed link works on click.)
 */
export async function GET(request) {
  const base = process.env.APP_BASE_URL || 'http://localhost:3000';
  try {
    const token = new URL(request.url).searchParams.get('token');
    const sess = token ? verifyVerify(token) : null;
    if (!sess) return NextResponse.redirect(`${base}/dashboard?verified=0`);

    const db = getDb(request);
    await db.run('UPDATE users SET email_verified = 1 WHERE id = ?', [sess.userId]);
    return NextResponse.redirect(`${base}/dashboard?verified=1`);
  } catch (err) {
    console.error('[/api/account/verify]', err);
    return NextResponse.redirect(`${base}/dashboard?verified=0`);
  }
}
