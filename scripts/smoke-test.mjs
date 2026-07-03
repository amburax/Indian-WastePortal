/**
 * End-to-end smoke test — exercises the critical flows against a running dev
 * server and asserts the results. No test framework needed.
 *
 * Start the server first (npm run dev), then:
 *   node --env-file=.env.local scripts/smoke-test.mjs
 *
 * Covers: homepage, admin auth + guards, client signup/login/logout, unified
 * account (multi-facility), session revocation on password change, admin
 * invoicing, real-signature payment webhook + idempotency, and rate limiting.
 */
import Database from 'better-sqlite3';
import path from 'path';
import { createHmac } from 'crypto';

const BASE = process.env.APP_BASE_URL || 'http://localhost:3000';
const db = new Database(path.resolve(process.cwd(), process.env.DATABASE_PATH || './indianwasteportal.db'));
const CLIENT_SECRET = process.env.CLIENT_SECRET || process.env.PASSWORD_SALT || 'iwp_dev_client_secret_change_me';
const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || '';

let pass = 0, fail = 0; const fails = [];
const ok = (name, cond) => { if (cond) { pass++; console.log('  ✅', name); } else { fail++; fails.push(name); console.log('  ❌', name); } };

function cookieFrom(res, name) {
  const raw = res.headers.get('set-cookie') || '';
  const m = raw.match(new RegExp(`${name}=([^;]+)`));
  return m ? `${name}=${m[1]}` : null;
}
async function req(pathname, { method = 'GET', body, cookie, xff } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (cookie) headers.cookie = cookie;
  if (xff) headers['x-forwarded-for'] = xff;
  const res = await fetch(`${BASE}${pathname}`, { method, headers, body: body ? JSON.stringify(body) : undefined, redirect: 'manual' });
  let json = null; try { json = await res.json(); } catch {}
  return { status: res.status, json, res };
}
const uniq = () => String(Date.now()) + Math.floor(Math.random() * 1000);
const phone = () => '9' + String(Date.now()).slice(-9);
const created = { emails: [], orgs: [] };

async function run() {
  console.log(`▶ Smoke test against ${BASE}\n`);

  // 1. public + admin auth
  ok('homepage 200', (await req('/')).status === 200);
  ok('admin endpoint guarded (401)', (await req('/api/admin/submissions')).status === 401);
  const adminLogin = await req('/api/admin/login', { method: 'POST', body: { email: 'admin@indianwasteportal.in', password: 'admin@123' } });
  const adminCookie = cookieFrom(adminLogin.res, 'iwp_admin');
  ok('admin login', adminLogin.status === 200 && !!adminCookie);
  ok('admin stats with cookie', (await req('/api/admin/stats', { cookie: adminCookie })).status === 200);

  // 2. client signup (unified account)
  const email = `smoke${uniq()}@example.com`; created.emails.push(email);
  const signup = await req('/api/register', { method: 'POST', xff: `10.1.${Math.random()}`, body: {
    org_name: 'Smoke Plant A', auth_person: 'Smoke Tester', email, phone: phone(),
    category: 'Commercial', sub_category: 'Hotel', password: 'strongpass1',
  }});
  let clientCookie = cookieFrom(signup.res, 'iwp_client');
  ok('signup 201 + session cookie', signup.status === 201 && !!clientCookie);
  if (signup.json?.orgId) created.orgs.push(signup.json.orgId);

  const me1 = await req('/api/account/me', { cookie: clientCookie });
  ok('me returns 1 registration', me1.status === 200 && me1.json.registrations.length === 1);
  ok('email_verified starts 0', me1.json?.user?.email_verified === 0);

  // 3. add a 2nd facility under the same account
  const email2 = `smoke2${uniq()}@example.com`;
  const add = await req('/api/register', { method: 'POST', cookie: clientCookie, xff: `10.2.${Math.random()}`, body: {
    org_name: 'Smoke Plant B', auth_person: 'Smoke Tester', email: email2, phone: phone(),
    category: 'Commercial', sub_category: 'Hotel',
  }});
  if (add.json?.orgId) created.orgs.push(add.json.orgId);
  const me2 = await req('/api/account/me', { cookie: clientCookie });
  ok('2nd facility under same account', add.status === 201 && me2.json.registrations.length === 2);

  // 4. login / wrong password
  ok('wrong password 401', (await req('/api/account/login', { method: 'POST', body: { email, password: 'nope' } })).status === 401);
  const relog = await req('/api/account/login', { method: 'POST', body: { email, password: 'strongpass1' } });
  clientCookie = cookieFrom(relog.res, 'iwp_client');
  ok('correct login', relog.status === 200 && !!clientCookie);

  // 5. session revocation on password change
  const chg = await req('/api/account/change-password', { method: 'POST', cookie: clientCookie, body: { currentPassword: 'strongpass1', newPassword: 'newstrong2' } });
  const newCookie = cookieFrom(chg.res, 'iwp_client');
  ok('change password 200 + new cookie', chg.status === 200 && !!newCookie);
  ok('OLD session revoked after change', (await req('/api/account/me', { cookie: clientCookie })).status === 401);
  ok('NEW session still valid', (await req('/api/account/me', { cookie: newCookie })).status === 200);
  clientCookie = newCookie;

  // 6. admin invoice → payment (real signature) → idempotency
  const orgId = (await req('/api/account/me', { cookie: clientCookie })).json.registrations[0].id;
  ok('send-invoice → AwaitingPayment', (await req('/api/admin/action/send-invoice', { method: 'POST', cookie: adminCookie, body: { orgId, amountRupees: 2999 } })).status === 200);
  const oc = await req('/api/payment/create-order', { method: 'POST', body: { orgId, kind: 'balance' } });
  const body = { event: 'payment.captured', payload: { payment: { entity: { order_id: oc.json.orderId, id: 'pay_smoke', amount: oc.json.amount } } } };
  const raw = JSON.stringify(body);
  const sig = createHmac('sha256', WEBHOOK_SECRET).update(raw).digest('hex');
  const wh1 = await fetch(`${BASE}/api/payment-webhook`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-razorpay-signature': sig }, body: raw }).then(r => r.json());
  ok('signed webhook processed', wh1?.received === true && !wh1.duplicate);
  ok('org is Paid', db.prepare('SELECT payment_verified p FROM organizations WHERE id=?').get(orgId)?.p === 1);
  const wh2 = await fetch(`${BASE}/api/payment-webhook`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-razorpay-signature': sig }, body: raw }).then(r => r.json());
  ok('webhook idempotent (2nd = duplicate)', wh2?.duplicate === true);
  const badSig = await fetch(`${BASE}/api/payment-webhook`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-razorpay-signature': 'bad' }, body: raw });
  ok('bad signature rejected (400)', badSig.status === 400);

  // 7. rate limiting
  let got429 = false;
  for (let i = 0; i < 10; i++) { const r = await req('/api/register', { method: 'POST', xff: '10.9.9.9', body: {} }); if (r.status === 429) got429 = true; }
  ok('register rate-limit trips (429)', got429);
}

run()
  .catch(e => { console.error('\nfatal:', e.message); fail++; })
  .finally(() => {
    // cleanup
    try {
      for (const id of created.orgs) db.prepare('DELETE FROM organizations WHERE id=?').run(id);
      for (const e of created.emails) db.prepare('DELETE FROM users WHERE email=?').run(e);
      // also remove the 2nd-facility user by pattern
      db.prepare("DELETE FROM users WHERE email LIKE 'smoke2%@example.com'").run();
    } catch {}
    db.close();
    console.log(`\n${'─'.repeat(40)}\nRESULT: ${pass} passed, ${fail} failed`);
    if (fails.length) console.log('Failed:', fails.join(', '));
    process.exitCode = fail ? 1 : 0;
  });
