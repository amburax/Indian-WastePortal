/**
 * Client accounts migration — users table + org ownership + service type.
 * Idempotent. Run: node --env-file=.env.local scripts/migrate-accounts.mjs
 */
import Database from 'better-sqlite3';
import path from 'path';
import { randomUUID } from 'crypto';

const db = new Database(path.resolve(process.cwd(), process.env.DATABASE_PATH || './indianwasteportal.db'));
console.log('🛠  Migrating (accounts)…');

function addColumn(table, col, def) {
  try { db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${def};`); console.log(`  + ${table}.${col}`); }
  catch (e) { if (/duplicate column/i.test(e.message)) console.log(`  · ${table}.${col} (exists)`); else throw e; }
}

// 1. users table (login identity)
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT,                                 -- NULL = login disabled until set
  full_name     TEXT,
  phone         TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
`);
console.log('  + table users');
addColumn('users', 'email_verified', 'INTEGER NOT NULL DEFAULT 0');
addColumn('users', 'session_epoch',  'INTEGER NOT NULL DEFAULT 0'); // bump to revoke all sessions

// 2. organizations ownership + service type
addColumn('organizations', 'user_id',      'TEXT');
addColumn('organizations', 'service_type', "TEXT NOT NULL DEFAULT 'solid_waste'");
db.exec('CREATE INDEX IF NOT EXISTS idx_orgs_user ON organizations(user_id);');

// 3. backfill: one user per distinct existing org email; link orgs to it.
const orgs = db.prepare("SELECT id, email, auth_person, phone FROM organizations WHERE email IS NOT NULL AND email != '' AND (user_id IS NULL OR user_id = '')").all();
const findUser = db.prepare('SELECT id FROM users WHERE email = ?');
const insUser  = db.prepare('INSERT INTO users (id, email, full_name, phone) VALUES (?,?,?,?)');
const linkOrg  = db.prepare('UPDATE organizations SET user_id = ? WHERE id = ?');
let created = 0, linked = 0;
const tx = db.transaction(() => {
  for (const o of orgs) {
    let u = findUser.get(o.email.toLowerCase().trim());
    if (!u) { const id = randomUUID(); insUser.run(id, o.email.toLowerCase().trim(), o.auth_person || null, o.phone || null); u = { id }; created++; }
    linkOrg.run(u.id, o.id); linked++;
  }
});
tx();
console.log(`  · backfill: ${created} users created, ${linked} orgs linked`);

db.close();
console.log('✅ Accounts migration complete.');
