/**
 * Indian Waste Portal V2 — Dual-Mode Database Layer
 *
 * Runtime detection:
 *  - In Cloudflare Workers (production): uses the D1 binding (env.DB)
 *    All D1 queries are async (await stmt.all() / .first() / .run())
 *
 *  - In Next.js dev server (local): falls back to better-sqlite3
 *    All queries are synchronous (.get() / .all() / .run())
 *
 * Usage in API routes:
 *   import { getDb } from '@/lib/d1-db';
 *   const db = getDb(request);   // pass the request object
 *   const org = await db.get('SELECT * FROM organizations WHERE id = ?', [id]);
 */

import path from 'path';
import fs   from 'fs';

// ── Detect runtime ─────────────────────────────────────────────
const IS_CF_WORKERS = typeof caches !== 'undefined' && typeof WebSocketPair !== 'undefined';

// ── Local SQLite singleton (dev only) ─────────────────────────
let _localDb = null;
function getLocalDb() {
  if (_localDb) return _localDb;
  // Dynamic import to avoid bundling on CF Workers
  const Database   = require('better-sqlite3');
  const DB_PATH    = process.env.DATABASE_PATH || './indianwasteportal.db';
  const SCHEMA_PATH = path.join(process.cwd(), 'lib', 'schema.sql');
  const dbPath     = path.resolve(process.cwd(), DB_PATH);
  const needsInit  = !fs.existsSync(dbPath);

  _localDb = new Database(dbPath);
  _localDb.pragma('journal_mode = WAL');
  _localDb.pragma('foreign_keys = ON');
  _localDb.pragma('synchronous = NORMAL');
  _localDb.pragma('cache_size = -32000');

  if (needsInit) {
    const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
    _localDb.exec(schema);
    console.log('✅ Indian Waste Portal local DB initialized at:', dbPath);
  }
  return _localDb;
}

// ── Unified DB adapter ────────────────────────────────────────
/**
 * Returns a unified async DB interface regardless of runtime.
 *
 * @param {Request|null} request - Next.js request (provides CF env bindings)
 * @param {object|null}  cfEnv   - Cloudflare env object (when in Worker context)
 * @returns {DbAdapter}
 */
export function getDb(request = null, cfEnv = null) {
  // Extract D1 binding from Cloudflare environment
  const d1 = cfEnv?.DB || (IS_CF_WORKERS ? globalThis.__CF_ENV__?.DB : null);

  if (d1) {
    return new D1Adapter(d1);
  }
  // PostgreSQL (DigitalOcean, Neon, RDS, …) — production. Selected when DATABASE_URL is set.
  if (process.env.DATABASE_URL) {
    return getPgAdapter();
  }
  // Serverless SQLite (Turso / libSQL) — Vercel / hosts without a persistent disk.
  if (process.env.TURSO_DATABASE_URL) {
    return getTursoAdapter();
  }
  return new LocalAdapter(getLocalDb());
}

// ── PostgreSQL Adapter (production: DigitalOcean Managed Postgres, etc.) ──────
// Same async get/run/all interface. A tiny translator adapts the app's
// SQLite-flavoured SQL (which also runs on D1/Turso) to Postgres at runtime.
let _pg = null;
function getPgAdapter() {
  if (_pg) return _pg;
  const { Pool, types } = require('pg');
  // Return timestamps as ISO-8601 strings (the app treats them as text, like
  // SQLite's datetime()), and BIGINT (e.g. COUNT(*)) as JS numbers not strings.
  const toIso = v => (v == null ? v : new Date(v.includes('+') || v.endsWith('Z') ? v : v + 'Z').toISOString());
  types.setTypeParser(1114, toIso);                  // timestamp (no tz → assume UTC)
  types.setTypeParser(1184, toIso);                  // timestamptz
  types.setTypeParser(20,  v => (v === null ? null : parseInt(v, 10))); // int8/bigint
  const url = process.env.DATABASE_URL;
  const needsSsl = /sslmode=require|\.ondigitalocean\.com|\.neon\.tech|\.supabase\./i.test(url);
  const pool = new Pool({
    connectionString: url,
    ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
    max: 10,
  });
  _pg = new PgAdapter(pool);
  return _pg;
}

// SQLite → Postgres SQL translation (the only two dialect gaps we use):
//  • ?-placeholders → $1, $2, …    • datetime('now'[, '+N unit']) → NOW() [+ INTERVAL]
function toPg(sql) {
  let i = 0;
  let out = sql.replace(/\?/g, () => `$${++i}`);
  out = out.replace(/datetime\('now',\s*'([+-])(\d+)\s+(\w+?)s?'\)/gi,
    (_, sign, n, unit) => `(NOW() ${sign} INTERVAL '${n} ${unit}')`);
  out = out.replace(/datetime\('now'\)/gi, 'NOW()');
  return out;
}

class PgAdapter {
  constructor(pool) { this.pool = pool; }
  async all(sql, params = []) { const r = await this.pool.query(toPg(sql), params); return r.rows; }
  async get(sql, params = []) { const r = await this.pool.query(toPg(sql), params); return r.rows[0] || null; }
  async run(sql, params = []) { const r = await this.pool.query(toPg(sql), params); return { changes: r.rowCount }; }
  async exec(sql) { return await this.pool.query(sql); }   // multi-statement schema (simple protocol, no params)
  async batch(statements) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const res = [];
      for (const { sql, params = [] } of statements) res.push(await client.query(toPg(sql), params));
      await client.query('COMMIT');
      return res;
    } catch (e) { await client.query('ROLLBACK'); throw e; }
    finally { client.release(); }
  }
}

// ── Turso / libSQL Adapter (serverless: Vercel, etc.) ─────────
// SQLite-compatible over HTTP. Same async get/run/all interface as the others.
let _turso = null;
function getTursoAdapter() {
  if (_turso) return _turso;
  const { createClient } = require('@libsql/client');
  const client = createClient({
    url:       process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
    intMode:   'number',            // return INTEGER as JS number, not BigInt
  });
  _turso = new TursoAdapter(client);
  return _turso;
}

function rowToObj(row, columns) {
  const o = {};
  for (const c of columns) o[c] = row[c];
  return o;
}

class TursoAdapter {
  constructor(client) { this.client = client; }

  async all(sql, params = []) {
    const r = await this.client.execute({ sql, args: params });
    return r.rows.map((row) => rowToObj(row, r.columns));
  }

  async get(sql, params = []) {
    const r = await this.client.execute({ sql, args: params });
    return r.rows.length ? rowToObj(r.rows[0], r.columns) : null;
  }

  async run(sql, params = []) {
    const r = await this.client.execute({ sql, args: params });
    return { changes: r.rowsAffected, lastInsertRowid: r.lastInsertRowid };
  }

  async exec(sql) {
    return await this.client.executeMultiple(sql);
  }

  async batch(statements) {
    return await this.client.batch(
      statements.map(({ sql, params = [] }) => ({ sql, args: params })),
      'write'
    );
  }
}

// ── D1 Adapter (Cloudflare production) ────────────────────────
class D1Adapter {
  constructor(d1Binding) {
    this.d1 = d1Binding;
  }

  /** Execute a SELECT returning multiple rows */
  async all(sql, params = []) {
    const stmt   = this.d1.prepare(sql);
    const result = await stmt.bind(...params).all();
    return result.results || [];
  }

  /** Execute a SELECT returning a single row (or null) */
  async get(sql, params = []) {
    const stmt = this.d1.prepare(sql);
    return await stmt.bind(...params).first();
  }

  /** Execute INSERT/UPDATE/DELETE */
  async run(sql, params = []) {
    const stmt   = this.d1.prepare(sql);
    return await stmt.bind(...params).run();
  }

  /** Execute raw SQL (for schema/migrations) */
  async exec(sql) {
    return await this.d1.exec(sql);
  }

  /**
   * Batch multiple statements atomically (D1 transaction).
   * @param {Array<{sql: string, params: any[]}>} statements
   */
  async batch(statements) {
    const prepared = statements.map(({ sql, params = [] }) =>
      this.d1.prepare(sql).bind(...params)
    );
    return await this.d1.batch(prepared);
  }
}

// ── Local SQLite Adapter (Next.js dev) ────────────────────────
// Wraps better-sqlite3 synchronous API in Promises
// so callers can always use `await`.
class LocalAdapter {
  constructor(db) {
    this.db = db;
  }

  async all(sql, params = []) {
    return this.db.prepare(sql).all(...params);
  }

  async get(sql, params = []) {
    return this.db.prepare(sql).get(...params) || null;
  }

  async run(sql, params = []) {
    return this.db.prepare(sql).run(...params);
  }

  async exec(sql) {
    return this.db.exec(sql);
  }

  async batch(statements) {
    const txn = this.db.transaction(() =>
      statements.map(({ sql, params = [] }) =>
        this.db.prepare(sql).run(...params)
      )
    );
    return txn();
  }
}

// ── Query helpers (used by API routes) ───────────────────────
export const Q = {
  // Organizations
  getOrgByEmail: (email)  => ['SELECT * FROM organizations WHERE email = ?', [email]],
  getOrgByPhone: (phone)  => ['SELECT * FROM organizations WHERE phone = ?', [phone]],
  getOrgById:    (id)     => ['SELECT * FROM organizations WHERE id = ?', [id]],
  getOrgByToken: (token)  => ['SELECT * FROM organizations WHERE payment_token = ?', [token]],
  getPaidOrgs:   ()       => ["SELECT * FROM organizations WHERE status = 'Paid'", []],
  getQueuedOrgs: ()       => ["SELECT * FROM organizations WHERE status IN ('Paid','Queued') ORDER BY queue_position ASC", []],

  insertOrg: (o) => [`
    INSERT INTO organizations
      (id, org_name, auth_person, email, phone, password_hash,
       category, sub_category, plan, payment_token)
    VALUES (?,?,?,?,?,?,?,?,?,?)
  `, [o.id, o.org_name, o.auth_person, o.email, o.phone, o.password_hash,
      o.category, o.sub_category, o.plan, o.payment_token]],

  updateStatus: (status, id) =>
    ['UPDATE organizations SET status = ? WHERE id = ?', [status, id]],

  updateStatusAndQueue: (status, queuePos, jobId, id) => [`
    UPDATE organizations
    SET status = ?, queue_position = ?, queue_job_id = ?, queued_at = datetime('now')
    WHERE id = ?
  `, [status, queuePos, jobId, id]],

  updateAck: (ackNumber, portalStatus, id) => [`
    UPDATE organizations
    SET ack_number = ?, portal_status = ?, status = 'Completed',
        completed_at = datetime('now')
    WHERE id = ?
  `, [ackNumber, portalStatus, id]],

  markPaymentVerified: (id) => [`
    UPDATE organizations SET payment_verified = 1 WHERE id = ?
  `, [id]],

  // Metrics
  upsertMetrics: (m) => [`
    INSERT INTO metrics
      (id, org_id, floor_area_sqm, waste_kg_per_day, water_liters_per_day,
       is_bulk_waste_generator, qualifying_criteria)
    VALUES (?,?,?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET
      floor_area_sqm = excluded.floor_area_sqm,
      waste_kg_per_day = excluded.waste_kg_per_day,
      water_liters_per_day = excluded.water_liters_per_day,
      is_bulk_waste_generator = excluded.is_bulk_waste_generator,
      qualifying_criteria = excluded.qualifying_criteria,
      updated_at = datetime('now')
  `, [m.id, m.org_id, m.floor_area_sqm, m.waste_kg_per_day, m.water_liters_per_day,
      m.is_bulk_waste_generator, m.qualifying_criteria]],

  getMetricsByOrg: (orgId) =>
    ['SELECT * FROM metrics WHERE org_id = ?', [orgId]],

  // LGD Addresses (V2 — with all new fields)
  insertAddress: (a) => [`
    INSERT INTO lgd_addresses
      (id, org_id, state_code, state_name, district_name, sub_district,
       city_name, full_address, zone_ward, local_body_type, pincode, latitude, longitude)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT (id) DO UPDATE SET
      org_id=excluded.org_id, state_code=excluded.state_code, state_name=excluded.state_name,
      district_name=excluded.district_name, sub_district=excluded.sub_district,
      city_name=excluded.city_name, full_address=excluded.full_address, zone_ward=excluded.zone_ward,
      local_body_type=excluded.local_body_type, pincode=excluded.pincode,
      latitude=excluded.latitude, longitude=excluded.longitude
  `, [a.id, a.org_id, a.state_code, a.state_name, a.district_name, a.sub_district,
      a.city_name, a.full_address, a.zone_ward, a.local_body_type, a.pincode,
      a.latitude, a.longitude]],

  getAddressByOrg: (orgId) =>
    ['SELECT * FROM lgd_addresses WHERE org_id = ?', [orgId]],

  // Payments
  insertPayment: (p) => [`
    INSERT INTO payments (id, org_id, razorpay_order_id, amount_paise, currency)
    VALUES (?,?,?,?,?)
  `, [p.id, p.org_id, p.razorpay_order_id, p.amount_paise, p.currency]],

  // Atomic idempotency claim: only flips created→paid, and only ONCE. The
  // `status != 'paid'` guard means a duplicate/racing webhook changes 0 rows,
  // so the caller can use the row count to gate money-affecting side effects.
  updatePaymentSuccess: (paymentId, signature, payload, orderId) => [`
    UPDATE payments SET
      razorpay_payment_id = ?,
      razorpay_signature = ?,
      status = 'paid',
      paid_at = datetime('now'),
      webhook_payload = ?
    WHERE razorpay_order_id = ? AND status != 'paid'
  `, [paymentId, signature, payload, orderId]],

  getPaymentByOrderId: (orderId) =>
    ['SELECT * FROM payments WHERE razorpay_order_id = ?', [orderId]],

  // Queue Jobs [V2]
  insertQueueJob: (j) => [`
    INSERT INTO queue_jobs (id, org_id, status, queue_position)
    VALUES (?,?,?,?)
  `, [j.id, j.org_id, j.status, j.queue_position]],

  updateQueueJob: (status, error, id) => [`
    UPDATE queue_jobs SET status = ?, last_error = ?,
      ${status === 'processing' ? "started_at = datetime('now')," : ''}
      ${status === 'done' || status === 'failed' ? "completed_at = datetime('now')," : ''}
      attempt_count = attempt_count + 1
    WHERE id = ?
  `.replace(/,\s*WHERE/, ' WHERE'), [status, error, id]],

  updateJobIntercept: (otp, captchaText, id) => [`
    UPDATE queue_jobs SET otp_input = ?, captcha_text_input = ?, status = 'processing' WHERE id = ?
  `, [otp, captchaText, id]],

  updateJobWaiting: (captchaBase64, id) => [`
    UPDATE queue_jobs SET captcha_image_base64 = ?, status = 'waiting_for_user' WHERE id = ?
  `, [captchaBase64, id]],

  getJobByOrgId: (orgId) => 
    ['SELECT * FROM queue_jobs WHERE org_id = ? ORDER BY created_at DESC LIMIT 1', [orgId]],

  getPendingJobs: () =>
    ["SELECT qj.*, o.* FROM queue_jobs qj JOIN organizations o ON qj.org_id = o.id WHERE qj.status = 'pending' ORDER BY qj.queue_position ASC LIMIT 10", []],

  getQueuePosition: (orgId) =>
    ['SELECT queue_position FROM organizations WHERE id = ?', [orgId]],

  countJobsAhead: (position) =>
    ["SELECT COUNT(*) as count FROM queue_jobs WHERE status IN ('pending','processing') AND queue_position < ?", [position]],

  // Queue Counter [V2]
  getQueueCount: () =>
    ["SELECT value FROM queue_counter WHERE key = 'global'", []],
  incrementQueueCount: () =>
    ["UPDATE queue_counter SET value = value + 1 WHERE key = 'global'", []],

  // E-Waste Waitlist
  insertWaitlist: (id, email, code) => [`
    INSERT INTO ewaste_waitlist (id, email, discount_code)
    VALUES (?,?,?)
    ON CONFLICT DO NOTHING
  `, [id, email, code]],

  // Agent Logs
  insertLog: (l) => [`
    INSERT INTO agent_logs (id, org_id, job_id, step, status, message, screenshot)
    VALUES (?,?,?,?,?,?,?)
  `, [l.id, l.org_id, l.job_id, l.step, l.status, l.message, l.screenshot]],
};
