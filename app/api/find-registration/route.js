import { NextResponse } from 'next/server';
import { getDb, Q }     from '../../../lib/d1-db';
import { sendEmail, statusLinkEmail } from '../../../lib/email';
import { sendNotification } from '../../../lib/notify';

/**
 * POST /api/find-registration  { email }
 * Magic-link recovery: emails (+ WhatsApps) the tracking link to the address on
 * file. Always returns a neutral message so it can't be used to probe which
 * emails are registered.
 */
export async function POST(request) {
  try {
    const { email } = await request.json();
    const neutral = NextResponse.json({
      ok: true,
      message: 'If that email is registered, we’ve sent your tracking link. Please check your inbox and WhatsApp.',
    });
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return neutral;

    const db  = getDb(request);
    const org = await db.get(...Q.getOrgByEmail(email.toLowerCase().trim()));
    if (!org) return neutral;   // don't reveal non-existence

    const tpl = statusLinkEmail({ orgName: org.org_name, token: org.payment_token });
    try { await sendEmail({ to: org.email, ...tpl }); } catch (e) { console.warn('[find] email failed:', e.message); }
    try {
      await sendNotification(db, {
        orgId: org.id, channel: 'whatsapp', type: 'status_link',
        payload: `Your Indian Waste Portal tracking link: ${process.env.APP_BASE_URL || 'https://indianwasteportal.com'}/status/${org.payment_token}`,
      });
    } catch (e) { console.warn('[find] whatsapp failed:', e.message); }

    return neutral;
  } catch (err) {
    console.error('[/api/find-registration]', err);
    return NextResponse.json({ ok: true, message: 'If that email is registered, we’ve sent your tracking link.' });
  }
}
