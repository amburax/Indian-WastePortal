import { NextResponse } from 'next/server';
import { getDb, Q }     from '../../../lib/d1-db';
import { randomUUID }   from 'crypto';
import { createHash }   from 'crypto';
import { sendEmail, receiptEmail, verifyEmail } from '../../../lib/email';
import { sendNotification }        from '../../../lib/notify';
import { requireUser, hashPassword, signToken, signVerify, CLIENT_COOKIE, sessionCookieOptions } from '../../../lib/client-auth';
import { rateLimit, clientIp } from '../../../lib/ratelimit';
import { reportError }         from '../../../lib/observability';

/**
 * POST /api/register
 * Creates a new organisation account.
 * Validates V2 fields: org_name, auth_person, email, phone, category, sub_category
 *
 * Note: no user-facing password — status is accessed via payment_token URL.
 * password_hash stores an internal random token to satisfy the NOT NULL constraint.
 */
export async function POST(request) {
  try {
    if (rateLimit(`register:${clientIp(request)}`, { max: 6, windowMs: 10 * 60_000 }).limited)
      return NextResponse.json({ error: 'Too many attempts — please try again in a few minutes.' }, { status: 429 });

    const body = await request.json();
    const {
      org_name, auth_person, email, phone,
      category, sub_category,
      plan = 'standard', password,
    } = body;

    // ── Validation ─────────────────────────────────────────
    if (!org_name?.trim() || org_name.trim().length < 3)
      return NextResponse.json({ error: 'Organisation name must be at least 3 characters' }, { status: 400 });
    if (!auth_person?.trim() || auth_person.trim().length < 2)
      return NextResponse.json({ error: 'Authorised person name is required' }, { status: 400 });
    if (!email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return NextResponse.json({ error: 'Valid email address is required' }, { status: 400 });
    if (!phone || !/^\d{10}$/.test(phone.replace(/\s/g, '')))
      return NextResponse.json({ error: '10-digit mobile number is required' }, { status: 400 });
    if (!category)
      return NextResponse.json({ error: 'Category is required' }, { status: 400 });

    const db = getDb(request);
    const cleanEmail = email.toLowerCase().trim();
    const cleanPhone = phone.replace(/\s/g, '');

    // ── Resolve the owning account ─────────────────────────
    // Logged in → attach the new facility to that account. Otherwise create an
    // account (needs a password) and log the customer in.
    const sessUser = await requireUser(request, db);
    let userId = null;
    let newSession = false;

    if (sessUser) {
      userId = sessUser.id;
    } else {
      if (!password || String(password).length < 8)
        return NextResponse.json({ error: 'Please choose a password (at least 8 characters)' }, { status: 400 });
      const existingUser = await db.get('SELECT id FROM users WHERE email = ?', [cleanEmail]);
      if (existingUser)
        return NextResponse.json({ error: 'An account with this email already exists — please log in.' }, { status: 409 });
      userId = randomUUID();
      await db.run('INSERT INTO users (id, email, password_hash, full_name, phone) VALUES (?,?,?,?,?)',
        [userId, cleanEmail, hashPassword(password), auth_person.trim(), cleanPhone]);
      newSession = true;
    }

    // Per-registration contact email must be unique (each facility its own contact).
    const existingEmail = await db.get(...Q.getOrgByEmail(cleanEmail));
    if (existingEmail)
      return NextResponse.json({ error: 'A registration with this contact email already exists. Use a different facility contact email.' }, { status: 409 });

    // ── Insert the registration ─────────────────────────────
    const orgId = randomUUID();
    const token = randomUUID();
    const internalToken = createHash('sha256').update(randomUUID()).digest('hex');

    await db.run(...Q.insertOrg({
      id:            orgId,
      org_name:      org_name.trim(),
      auth_person:   auth_person.trim(),
      email:         cleanEmail,
      phone:         cleanPhone,
      password_hash: internalToken,
      category:      category,
      sub_category:  sub_category || null,
      plan,
      payment_token: token,
    }));
    await db.run('UPDATE organizations SET user_id = ? WHERE id = ?', [userId, orgId]);

    // Transactional receipt — fire immediately, but never block the response.
    try {
      const tpl = receiptEmail({
        orgName: org_name.trim(),
        authPerson: auth_person.trim(),
        category,
        token,
      });
      await sendEmail({ to: email.toLowerCase().trim(), ...tpl });
    } catch (e) {
      console.warn('[register] receipt email failed (non-fatal):', e.message);
    }
    // Auto-deliver the tracking link by WhatsApp too.
    try {
      await sendNotification(db, {
        orgId, channel: 'whatsapp', type: 'status_link',
        payload: `Thanks for registering with Indian Waste Portal. Track your filing here: ${process.env.APP_BASE_URL || 'https://indianwasteportal.in'}/status/${token}`,
      });
    } catch (e) { console.warn('[register] whatsapp link failed (non-fatal):', e.message); }

    // On new account creation, send an email-verification link.
    if (newSession) {
      try {
        const base = process.env.APP_BASE_URL || 'http://localhost:3000';
        const verifyUrl = `${base}/api/account/verify?token=${encodeURIComponent(signVerify(userId))}`;
        await sendEmail({ to: cleanEmail, ...verifyEmail({ verifyUrl }) });
      } catch (e) { console.warn('[register] verify email failed (non-fatal):', e.message); }
    }

    const res = NextResponse.json({ orgId, token, loggedIn: true, message: 'Registration successful' }, { status: 201 });
    if (newSession) res.cookies.set(CLIENT_COOKIE, signToken(userId), sessionCookieOptions());
    return res;

  } catch (err) {
    reportError(err, { route: 'POST /api/register' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
