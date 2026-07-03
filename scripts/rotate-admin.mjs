/**
 * Rotate (or create) an admin password before production deploy.
 *
 *   node --env-file=.env.local scripts/rotate-admin.mjs <email> <newPassword>
 *   # or rely on env:
 *   ADMIN_EMAIL=admin@indianwasteportal.in NEW_ADMIN_PASSWORD='S3cure!' \
 *     node --env-file=.env.local scripts/rotate-admin.mjs
 *
 * Targets the DB at DATABASE_PATH (./wasteebank.db in this project). The hash
 * uses the SAME salt resolution as lib/admin-auth.js, so a rotated password
 * verifies correctly at login.
 */
import Database from 'better-sqlite3';
import path from 'path';
import { randomUUID } from 'crypto';
import { hashPassword } from '../lib/admin-auth.js';

const email = (process.argv[2] || process.env.ADMIN_EMAIL || '').toLowerCase().trim();
const pw    = process.argv[3] || process.env.NEW_ADMIN_PASSWORD || '';

if (!email || !pw) {
  console.error('Usage: node --env-file=.env.local scripts/rotate-admin.mjs <email> <newPassword>');
  process.exit(1);
}
if (pw.length < 8) {
  console.error('❌ Refusing: password must be at least 8 characters.');
  process.exit(1);
}

const DB_PATH = process.env.DATABASE_PATH || './indianwasteportal.db';
const db = new Database(path.resolve(process.cwd(), DB_PATH));
const hash = hashPassword(pw);

const existing = db.prepare('SELECT id FROM admin_users WHERE email = ?').get(email);
if (existing) {
  db.prepare('UPDATE admin_users SET password_hash = ? WHERE email = ?').run(hash, email);
  console.log(`🔑 Rotated password for ${email}`);
} else {
  db.prepare('INSERT INTO admin_users (id, email, password_hash, role) VALUES (?,?,?,?)')
    .run(randomUUID(), email, hash, 'superadmin');
  console.log(`➕ Created admin ${email}`);
}

// Audit the rotation (action attributable to a script run).
try {
  db.prepare('INSERT INTO audit_log (id, admin_email, action, meta) VALUES (?,?,?,?)')
    .run(randomUUID(), email, 'password_rotated', JSON.stringify({ via: 'rotate-admin.mjs' }));
} catch { /* audit table optional */ }

db.close();
console.log('✅ Done. Remove NEW_ADMIN_PASSWORD from your shell history if you passed it inline.');
