/**
 * Initialise a Turso (libSQL) database for serverless hosting (Vercel).
 *
 *   node --env-file=.env.local scripts/init-turso.mjs
 *
 * Requires in .env.local:  TURSO_DATABASE_URL, TURSO_AUTH_TOKEN
 * Optional:                ADMIN_EMAIL, ADMIN_PASSWORD, PASSWORD_SALT
 *
 * It copies the FULL current schema from your local dev DB (which already has
 * every migration applied) into Turso — so the remote schema always matches the
 * app — then seeds the admin user + example pricing. Idempotent.
 */
import Database        from 'better-sqlite3';
import { createClient } from '@libsql/client';
import path            from 'path';
import { randomUUID }  from 'crypto';
import { hashPassword } from '../lib/admin-auth.js';

const url       = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
if (!url) {
  console.error('❌ Set TURSO_DATABASE_URL (and TURSO_AUTH_TOKEN) in .env.local first.');
  process.exit(1);
}

// 1. Read the full current schema from the local dev DB.
const localPath = path.resolve(process.cwd(), process.env.DATABASE_PATH || './wasteebank.db');
let local;
try {
  local = new Database(localPath, { readonly: true, fileMustExist: true });
} catch {
  console.error(`❌ Local DB not found at ${localPath}.`);
  console.error('   Run the app locally once (npm run init-db + the migrate-*.mjs scripts) so the schema exists to copy.');
  process.exit(1);
}
const objects = local.prepare(`
  SELECT type, name, sql FROM sqlite_master
  WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%'
  ORDER BY CASE type WHEN 'table' THEN 0 WHEN 'index' THEN 1 ELSE 2 END, name
`).all();
local.close();
console.log(`📋 ${objects.length} schema objects found in ${path.basename(localPath)}`);

// 2. Apply the schema to Turso (idempotent — skip anything that already exists).
const turso = createClient({ url, authToken, intMode: 'number' });
for (const o of objects) {
  try { await turso.execute(o.sql); console.log(`  + ${o.type} ${o.name}`); }
  catch (e) {
    if (/already exists/i.test(e.message)) console.log(`  · ${o.type} ${o.name} (exists)`);
    else { console.error(`  ✗ ${o.type} ${o.name}: ${e.message}`); throw e; }
  }
}

// 3. Queue counter.
await turso.execute("INSERT OR IGNORE INTO queue_counter (key, value) VALUES ('global', 0)");

// 4. Admin user (from env; password hash is self-contained/portable).
const email = (process.env.ADMIN_EMAIL || 'admin@indianwasteportal.in').toLowerCase().trim();
const pw    = process.env.ADMIN_PASSWORD || 'admin@123';
const hash  = hashPassword(pw);
const ex = await turso.execute({ sql: 'SELECT id FROM admin_users WHERE email = ?', args: [email] });
if (ex.rows.length) {
  await turso.execute({ sql: 'UPDATE admin_users SET password_hash = ? WHERE email = ?', args: [hash, email] });
  console.log(`👤 admin updated: ${email}`);
} else {
  await turso.execute({ sql: 'INSERT INTO admin_users (id, email, password_hash, role) VALUES (?,?,?,?)', args: [randomUUID(), email, hash, 'superadmin'] });
  console.log(`👤 admin created: ${email}`);
}

// 5. Example pricing (only if the book is empty).
const pc = await turso.execute('SELECT COUNT(*) AS c FROM pricing_rules').catch(() => null);
if (pc && Number(pc.rows[0].c) === 0) {
  const seed = [['Hospital', 'Urban', 299900], ['Big Hospital', 'Urban', 699900], ['Industry', 'Any', 1000000]];
  for (const [t, l, a] of seed)
    await turso.execute({ sql: 'INSERT INTO pricing_rules (id, est_type, location, amount_paise) VALUES (?,?,?,?)', args: [randomUUID(), t, l, a] });
  console.log(`💰 seeded ${seed.length} example pricing rules`);
}

console.log('\n✅ Turso database ready. Put TURSO_DATABASE_URL + TURSO_AUTH_TOKEN in Vercel and deploy.');
