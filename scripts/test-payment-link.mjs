/**
 * Harness for the balance-invoice webhook path (Razorpay `payment_link.paid`).
 * Proves processBalanceLink() flips an AwaitingPayment org → Paid + payment_verified.
 *
 * Non-destructive: snapshots the target org, runs the test, then restores it.
 *
 * Prereqs: dev server running, ALLOW_DEV_WEBHOOK_BYPASS=true, RAZORPAY_WEBHOOK_SECRET set.
 * Run:  node --env-file=.env.local scripts/test-payment-link.mjs [orgId]
 */
import Database from 'better-sqlite3';
import path from 'path';
import { randomUUID } from 'crypto';

const BASE    = process.env.APP_BASE_URL || 'http://localhost:3000';
const DB_PATH = process.env.DATABASE_PATH || './indianwasteportal.db';
const db = new Database(path.resolve(process.cwd(), DB_PATH));

const orgId = process.argv[2] ||
  db.prepare('SELECT id FROM organizations ORDER BY created_at DESC LIMIT 1').get()?.id;
if (!orgId) { console.error('No org to test against.'); process.exit(1); }

const COLS = 'status, payment_verified, balance_amount_paise, balance_invoice_url, balance_payment_link_id';
const snap = db.prepare(`SELECT ${COLS} FROM organizations WHERE id = ?`).get(orgId);
console.log(`▶ testing org ${orgId}  (snapshot: status=${snap.status}, verified=${snap.payment_verified})`);

const plink     = `plink_test_${randomUUID().slice(0, 10)}`;
const testPayId = randomUUID();

function restore() {
  db.prepare(`UPDATE organizations SET status=?, payment_verified=?, balance_amount_paise=?, balance_invoice_url=?, balance_payment_link_id=? WHERE id=?`)
    .run(snap.status, snap.payment_verified, snap.balance_amount_paise, snap.balance_invoice_url, snap.balance_payment_link_id, orgId);
  db.prepare('DELETE FROM payments WHERE id = ?').run(testPayId);
}

try {
  // 1. Arrange: put the org in AwaitingPayment with a balance Payment Link.
  db.prepare(`UPDATE organizations
              SET status='AwaitingPayment', payment_verified=0, balance_amount_paise=749900, balance_payment_link_id=?
              WHERE id=?`).run(plink, orgId);
  db.prepare(`INSERT INTO payments (id, org_id, razorpay_order_id, amount_paise, currency, kind, status)
              VALUES (?,?,?,?,?,?,?)`).run(testPayId, orgId, plink, 749900, 'INR', 'balance', 'created');

  // 2. Act: fire the payment_link.paid webhook (DEV_BYPASS).
  const res = await fetch(`${BASE}/api/payment-webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-razorpay-signature': 'DEV_BYPASS' },
    body: JSON.stringify({
      event: 'payment_link.paid',
      payload: {
        payment_link: { entity: { id: plink, notes: { org_id: orgId } } },
        payment:      { entity: { id: 'pay_test', order_id: 'order_test' } },
      },
    }),
  });
  const body = await res.json().catch(() => ({}));
  console.log(`  webhook → HTTP ${res.status} ${JSON.stringify(body)}`);

  // 3. Assert.
  const after   = db.prepare(`SELECT status, payment_verified FROM organizations WHERE id=?`).get(orgId);
  const payRow  = db.prepare(`SELECT status FROM payments WHERE id=?`).get(testPayId);
  const ok = res.ok && after.payment_verified === 1 && after.status === 'Paid' && payRow.status === 'paid';

  console.log(`  org → status=${after.status}, payment_verified=${after.payment_verified}; balance payment → ${payRow.status}`);
  console.log(ok ? '✅ PASS — payment_link.paid correctly settled the balance.' : '❌ FAIL — see values above.');
  restore();
  console.log('↩ restored org to its original state.');
  db.close();
  process.exitCode = ok ? 0 : 1;   // let the loop drain (avoids Windows exit-race assert)
} catch (err) {
  console.error('error:', err.message);
  try { restore(); } catch {}
  db.close();
  process.exitCode = 1;
}
