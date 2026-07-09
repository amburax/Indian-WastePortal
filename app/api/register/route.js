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
    if ((await rateLimit(request, `register:${clientIp(request)}`, { max: 6, windowMs: 10 * 60_000 })).limited)
      return NextResponse.json({ error: 'Too many attempts — please try again in a few minutes.' }, { status: 429 });

    let body;
    try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid request body' }, { status: 400 }); }
    const {
      org_name, auth_person, email, phone,
      category, sub_category,
      plan = 'standard', password,
      metrics, address,
    } = body;

    // ── Validation (everything up front — nothing is written until it all passes) ──
    // Server-side mirror of the client rules — a direct POST must not bypass them.
    const LETTER = /[a-zA-Zऀ-ॿ઀-૿]/;   // Latin, Devanagari, Gujarati
    const orgName = org_name?.trim() || '';
    const person  = auth_person?.trim() || '';
    if (orgName.length < 3 || !LETTER.test(orgName))
      return NextResponse.json({ error: 'Enter a valid organisation name (at least 3 characters, not just numbers)' }, { status: 400 });
    if (person.length < 2 || !/^[a-zA-Zऀ-ॿ઀-૿][a-zA-Zऀ-ॿ઀-૿\s.'-]*$/.test(person))
      return NextResponse.json({ error: 'Enter a valid authorised person name (letters only)' }, { status: 400 });
    if (!email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return NextResponse.json({ error: 'Valid email address is required' }, { status: 400 });
    if (!phone || !/^[6-9]\d{9}$/.test(phone.replace(/\s/g, '')))
      return NextResponse.json({ error: 'Enter a valid 10-digit Indian mobile number (starting 6–9)' }, { status: 400 });
    if (!category)
      return NextResponse.json({ error: 'Category is required' }, { status: 400 });
    if (!sub_category?.trim())
      return NextResponse.json({ error: 'Sub-category is required' }, { status: 400 });
    // BWG condition (SWM 2026): must cross at least one threshold.
    if (metrics) {
      const a = parseFloat(metrics.floor_area_sqm)       || 0;
      const w = parseFloat(metrics.waste_kg_per_day)     || 0;
      const l = parseFloat(metrics.water_liters_per_day) || 0;
      if (!(a > 0) || !(w > 0) || !(l > 0))
        return NextResponse.json({ error: 'Floor area, waste, and water must all be positive numbers.' }, { status: 400 });
      // Sane upper bounds — block typos/garbage like 100 billion sq.m.
      if (a > 10_000_000 || w > 1_000_000 || l > 100_000_000)
        return NextResponse.json({ error: 'A metric value is unrealistically large — please check floor area, waste, and water.' }, { status: 400 });
      if (!(a >= 20000 || w >= 100 || l >= 40000))
        return NextResponse.json({ error: "These figures don't meet any Bulk Waste Generator threshold (≥ 20,000 sq.m OR ≥ 40,000 L/day OR ≥ 100 kg/day)." }, { status: 400 });
    }
    // Address is part of the same filing — validate it before we commit anything.
    if (address) {
      if (!address.state_code || !address.district_name?.trim() || !address.city_name?.trim())
        return NextResponse.json({ error: 'State, district, and city are required' }, { status: 400 });
      if (!address.sub_district?.trim())
        return NextResponse.json({ error: 'Sub-district / Taluka is required' }, { status: 400 });
      if (!address.full_address?.trim())
        return NextResponse.json({ error: 'Full address is required' }, { status: 400 });
      if (!address.local_body_type)
        return NextResponse.json({ error: 'Local body type is required' }, { status: 400 });
      if (!address.pincode || !/^\d{6}$/.test(String(address.pincode)))
        return NextResponse.json({ error: 'Valid 6-digit pincode is required' }, { status: 400 });
      if (address.latitude == null || address.latitude === '' || Number.isNaN(parseFloat(address.latitude)) ||
          address.longitude == null || address.longitude === '' || Number.isNaN(parseFloat(address.longitude)))
        return NextResponse.json({ error: 'Latitude and longitude are required' }, { status: 400 });
    }

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
      newSession = true;
    }

    // Per-registration contact email must be unique (each facility its own contact).
    const existingEmail = await db.get(...Q.getOrgByEmail(cleanEmail));
    if (existingEmail)
      return NextResponse.json({ error: 'A registration with this contact email already exists. Use a different facility contact email.' }, { status: 409 });

    // ── Compose the whole registration as ONE atomic transaction ────────────────
    // Account + organisation + metrics + address are written together, so a
    // partial failure can never leave (e.g.) an org saved with no metrics.
    const orgId = randomUUID();
    const token = randomUUID();
    const internalToken = createHash('sha256').update(randomUUID()).digest('hex');
    const S = ([sql, params]) => ({ sql, params });   // Q helper → batch statement
    const stmts = [];

    if (newSession) {
      stmts.push({
        sql: 'INSERT INTO users (id, email, password_hash, full_name, phone) VALUES (?,?,?,?,?)',
        params: [userId, cleanEmail, hashPassword(password), auth_person.trim(), cleanPhone],
      });
    }

    stmts.push(S(Q.insertOrg({
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
    })));
    stmts.push({ sql: 'UPDATE organizations SET user_id = ? WHERE id = ?', params: [userId, orgId] });

    // Metrics — server-side BWG re-verification (can't be spoofed by the client).
    if (metrics) {
      const area  = parseFloat(metrics.floor_area_sqm)       || 0;
      const waste = parseFloat(metrics.waste_kg_per_day)     || 0;
      const water = parseFloat(metrics.water_liters_per_day) || 0;
      const isBWG = area >= 20000 || waste >= 100 || water >= 40000;
      stmts.push(S(Q.upsertMetrics({
        id: randomUUID(), org_id: orgId,
        floor_area_sqm: area, waste_kg_per_day: waste, water_liters_per_day: water,
        is_bulk_waste_generator: isBWG ? 1 : 0,
        qualifying_criteria: typeof metrics.qualifying_criteria === 'string'
          ? metrics.qualifying_criteria
          : JSON.stringify(metrics.qualifying_criteria || []),
      })));
    }

    // Address (full LGD detail).
    if (address) {
      stmts.push(S(Q.insertAddress({
        id: randomUUID(), org_id: orgId,
        state_code:      address.state_code,
        state_name:      address.state_name || '',
        district_name:   address.district_name,
        sub_district:    address.sub_district || null,
        city_name:       address.city_name,
        full_address:    address.full_address || `${address.city_name}, ${address.district_name}, ${address.state_name || address.state_code}`,
        zone_ward:       address.zone_ward || null,
        local_body_type: address.local_body_type || null,
        pincode:         address.pincode || null,
        latitude:        address.latitude  ? parseFloat(address.latitude)  : null,
        longitude:       address.longitude ? parseFloat(address.longitude) : null,
      })));
    }

    await db.batch(stmts);   // all-or-nothing

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
        payload: `Thanks for registering with Indian Waste Portal. Track your filing here: ${process.env.APP_BASE_URL || 'https://indianwasteportal.com'}/status/${token}`,
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
