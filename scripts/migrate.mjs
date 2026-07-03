/**
 * Phase 1 migration — applies the admin/scheduling/OTP additions to an
 * existing database. Safe to run repeatedly (idempotent).
 * Run: node --env-file=.env.local scripts/migrate.mjs
 */
import Database from 'better-sqlite3';
import path from 'path';
import { randomUUID } from 'crypto';
import { hashPassword } from '../lib/admin-auth.js';

const DB_PATH = process.env.DATABASE_PATH || './indianwasteportal.db';
const dbPath  = path.resolve(process.cwd(), DB_PATH);
console.log('🛠  Migrating:', dbPath);
const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

function addColumn(table, col, def) {
  try {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${def};`);
    console.log(`  + ${table}.${col}`);
  } catch (e) {
    if (/duplicate column/i.test(e.message)) console.log(`  · ${table}.${col} (exists)`);
    else throw e;
  }
}

// 1. organizations — scheduling columns
addColumn('organizations', 'appointment_at',   'TEXT');
addColumn('organizations', 'consultant_notes', 'TEXT');
addColumn('organizations', 'assigned_admin',   'TEXT');

// 2. queue_jobs — OTP accounting
addColumn('queue_jobs', 'otp_attempts',     'INTEGER NOT NULL DEFAULT 0');
addColumn('queue_jobs', 'otp_locked_until', 'TEXT');
addColumn('queue_jobs', 'otp_sent_at',      'TEXT');

// 3. new tables
db.exec(`
CREATE TABLE IF NOT EXISTS admin_users (
  id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin', created_at TEXT NOT NULL DEFAULT (datetime('now')) );
CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY, admin_email TEXT, org_id TEXT, action TEXT NOT NULL,
  meta TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')) );
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY, org_id TEXT NOT NULL, channel TEXT NOT NULL, type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued', payload TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')) );
CREATE INDEX IF NOT EXISTS idx_audit_org         ON audit_log(org_id);
CREATE INDEX IF NOT EXISTS idx_notifications_org ON notifications(org_id);
CREATE INDEX IF NOT EXISTS idx_orgs_appointment  ON organizations(appointment_at);
`);
console.log('  + tables: admin_users, audit_log, notifications');

// 4. seed admin user
const email = process.env.ADMIN_EMAIL || 'admin@indianwasteportal.in';
const pw    = process.env.ADMIN_PASSWORD || 'admin@123';
const exists = db.prepare('SELECT id FROM admin_users WHERE email = ?').get(email);
if (exists) {
  db.prepare('UPDATE admin_users SET password_hash = ? WHERE email = ?').run(hashPassword(pw), email);
  console.log(`  · admin user updated: ${email}`);
} else {
  db.prepare('INSERT INTO admin_users (id, email, password_hash, role) VALUES (?,?,?,?)')
    .run(randomUUID(), email, hashPassword(pw), 'superadmin');
  console.log(`  + admin user created: ${email}`);
}

db.close();
console.log('✅ Migration complete.');
