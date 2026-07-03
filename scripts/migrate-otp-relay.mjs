/**
 * Manual-filing OTP relay migration — adds otp_requested_at / manual_otp /
 * manual_otp_at to organizations. Idempotent. Runs against the local dev DB and,
 * if TURSO_DATABASE_URL is set, against Turso too.
 *   node --env-file=.env.local scripts/migrate-otp-relay.mjs
 */
import Database from 'better-sqlite3';
import path     from 'path';

const COLUMNS = [
  ['otp_requested_at', 'TEXT'],
  ['manual_otp',       'TEXT'],
  ['manual_otp_at',    'TEXT'],
];

// ── Local SQLite ──────────────────────────────────────────────
try {
  const db = new Database(path.resolve(process.cwd(), process.env.DATABASE_PATH || './wasteebank.db'));
  for (const [col, def] of COLUMNS) {
    try { db.exec(`ALTER TABLE organizations ADD COLUMN ${col} ${def};`); console.log(`  local + organizations.${col}`); }
    catch (e) { if (/duplicate column/i.test(e.message)) console.log(`  local · organizations.${col} (exists)`); else throw e; }
  }
  db.close();
} catch (e) { console.log('  (local DB skipped:', e.message, ')'); }

// ── Turso (if configured) ─────────────────────────────────────
if (process.env.TURSO_DATABASE_URL) {
  const { createClient } = await import('@libsql/client');
  const turso = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN, intMode: 'number' });
  for (const [col, def] of COLUMNS) {
    try { await turso.execute(`ALTER TABLE organizations ADD COLUMN ${col} ${def};`); console.log(`  turso + organizations.${col}`); }
    catch (e) { if (/duplicate column|already exists/i.test(e.message)) console.log(`  turso · organizations.${col} (exists)`); else throw e; }
  }
}

console.log('✅ OTP-relay migration complete.');
