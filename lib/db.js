/**
 * Indian Waste Portal — Database Connection Singleton
 * Uses better-sqlite3 locally (synchronous, fast, no server needed).
 * For Cloudflare D1 production, swap the `getDb()` call with the D1 binding.
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = process.env.DATABASE_PATH || './indianwasteportal.db';
const SCHEMA_PATH = path.join(process.cwd(), 'lib', 'schema.sql');

let _db = null;

/**
 * Returns the singleton DB connection.
 * Initializes the schema on first call if DB doesn't exist.
 */
export function getDb() {
  if (_db) return _db;

  const dbPath = path.resolve(process.cwd(), DB_PATH);
  const needsInit = !fs.existsSync(dbPath);

  _db = new Database(dbPath);

  // Performance pragmas
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');
  _db.pragma('synchronous = NORMAL');
  _db.pragma('cache_size = -64000'); // 64MB cache

  if (needsInit) {
    const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
    _db.exec(schema);
    console.log('✅ Indian Waste Portal DB initialized at:', dbPath);
  }

  return _db;
}

/**
 * Utility: run a function inside a transaction.
 * @param {Function} fn - function that receives the db instance
 */
export function withTransaction(fn) {
  const db = getDb();
  const txn = db.transaction(fn);
  return txn(db);
}

// ── Prepared-statement helpers ───────────────────────────

export const queries = {
  /** Organizations */
  getOrgByEmail: (db) =>
    db.prepare('SELECT * FROM organizations WHERE email = ?'),
  getOrgById: (db) =>
    db.prepare('SELECT * FROM organizations WHERE id = ?'),
  getOrgByToken: (db) =>
    db.prepare('SELECT * FROM organizations WHERE payment_token = ?'),
  insertOrg: (db) =>
    db.prepare(`
      INSERT INTO organizations
        (id, contact_name, email, phone, password_hash, org_name, org_type, gst_number, pan_number, plan, payment_token)
      VALUES
        (@id, @contact_name, @email, @phone, @password_hash, @org_name, @org_type, @gst_number, @pan_number, @plan, @payment_token)
    `),
  updateOrgStatus: (db) =>
    db.prepare('UPDATE organizations SET status = ? WHERE id = ?'),
  updateOrgAck: (db) =>
    db.prepare('UPDATE organizations SET ack_number = ?, status = ? WHERE id = ?'),
  getPaidOrgs: (db) =>
    db.prepare("SELECT * FROM organizations WHERE status = 'Paid'"),

  /** Metrics */
  upsertMetrics: (db) =>
    db.prepare(`
      INSERT INTO metrics
        (id, org_id, floor_area_sqm, waste_kg_per_day, water_liters_per_day, is_bulk_waste_generator, qualifying_criteria)
      VALUES
        (@id, @org_id, @floor_area_sqm, @waste_kg_per_day, @water_liters_per_day, @is_bulk_waste_generator, @qualifying_criteria)
      ON CONFLICT(id) DO UPDATE SET
        floor_area_sqm = excluded.floor_area_sqm,
        waste_kg_per_day = excluded.waste_kg_per_day,
        water_liters_per_day = excluded.water_liters_per_day,
        is_bulk_waste_generator = excluded.is_bulk_waste_generator,
        qualifying_criteria = excluded.qualifying_criteria,
        updated_at = datetime('now')
    `),
  getMetricsByOrg: (db) =>
    db.prepare('SELECT * FROM metrics WHERE org_id = ?'),

  /** LGD Address */
  insertAddress: (db) =>
    db.prepare(`
      INSERT OR REPLACE INTO lgd_addresses
        (id, org_id, state_code, state_name, district_code, district_name, city_name, ward_name, pincode, full_address)
      VALUES
        (@id, @org_id, @state_code, @state_name, @district_code, @district_name, @city_name, @ward_name, @pincode, @full_address)
    `),
  getAddressByOrg: (db) =>
    db.prepare('SELECT * FROM lgd_addresses WHERE org_id = ?'),

  /** Payments */
  insertPayment: (db) =>
    db.prepare(`
      INSERT INTO payments
        (id, org_id, razorpay_order_id, amount_paise, currency)
      VALUES
        (@id, @org_id, @razorpay_order_id, @amount_paise, @currency)
    `),
  updatePaymentSuccess: (db) =>
    db.prepare(`
      UPDATE payments SET
        razorpay_payment_id = ?,
        razorpay_signature = ?,
        status = 'paid',
        paid_at = datetime('now'),
        webhook_payload = ?
      WHERE razorpay_order_id = ?
    `),
  getPaymentByOrderId: (db) =>
    db.prepare('SELECT * FROM payments WHERE razorpay_order_id = ?'),

  /** E-Waste Waitlist */
  insertWaitlist: (db) =>
    db.prepare(`
      INSERT OR IGNORE INTO ewaste_waitlist (id, email, discount_code)
      VALUES (@id, @email, @discount_code)
    `),

  /** Agent Logs */
  insertLog: (db) =>
    db.prepare(`
      INSERT INTO agent_logs (id, org_id, step, status, message, screenshot)
      VALUES (@id, @org_id, @step, @status, @message, @screenshot)
    `),
};
