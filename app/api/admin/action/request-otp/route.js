import { NextResponse }     from 'next/server';
import { getDb, Q }         from '../../../../../lib/d1-db';
import { getAdmin }         from '../../../../../lib/admin-auth';
import { writeAudit }       from '../../../../../lib/audit';
import { sendNotification } from '../../../../../lib/notify';

/**
 * POST /api/admin/action/request-otp
 * Manual filing: ask the client to share the CPCB OTP on their own status page.
 * Sets otp_requested_at = now and clears any prior OTP. Body: { orgId }
 */
export async function POST(request) {
  const admin = getAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { orgId } = await request.json();
    if (!orgId) return NextResponse.json({ error: 'orgId required' }, { status: 400 });

    const db  = getDb(request);
    const org = await db.get(...Q.getOrgById(orgId));
    if (!org) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await db.run(
      "UPDATE organizations SET otp_requested_at = datetime('now'), manual_otp = NULL, manual_otp_at = NULL WHERE id = ?",
      [orgId]
    );

    // Nudge the client to open their tracking page (logged in dev).
    try {
      await sendNotification(db, {
        orgId, channel: 'whatsapp', type: 'otp_link',
        payload: `Action needed: open your tracking page and enter the CPCB OTP sent to your phone → ${(process.env.APP_BASE_URL || 'https://indianwasteportal.in')}/status/${org.payment_token}`,
      });
    } catch { /* non-fatal */ }

    await writeAudit(db, { adminEmail: admin.email, orgId, action: 'request_otp' });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[admin/action/request-otp]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
