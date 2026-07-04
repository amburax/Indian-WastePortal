/**
 * Initialise a PostgreSQL database for production (DigitalOcean Managed PG, etc.)
 *
 *   node --env-file=.env.local scripts/init-postgres.mjs
 *   node --env-file=.env.local scripts/init-postgres.mjs --pincodes   # also seed pincode_directory
 *   node --env-file=.env.local scripts/init-postgres.mjs --pincodes --reseed   # force re-seed pincodes
 *
 * Requires in .env.local:  DATABASE_URL  (postgres://user:pass@host:port/db?sslmode=require)
 * Optional:                ADMIN_EMAIL, ADMIN_PASSWORD, PASSWORD_SALT
 *
 * Applies lib/schema.pg.sql (the full current schema, Postgres-native), then
 * seeds the admin user + example pricing + queue counter. Idempotent.
 * With --pincodes it also loads the ~155k-row LGD pincode directory from
 * public/mosaic/all-india-pincode-2025.csv (batched). Safe to run repeatedly.
 */
import fs             from 'fs';
import path           from 'path';
import { randomUUID } from 'crypto';
import { fileURLToPath } from 'url';
import pg             from 'pg';
import { parse }      from 'csv-parse';
import { hashPassword } from '../lib/admin-auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root      = path.resolve(__dirname, '..');

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('❌ Set DATABASE_URL in .env.local first (postgres://…?sslmode=require).');
  process.exit(1);
}
const doPincodes = process.argv.includes('--pincodes');
const reseed     = process.argv.includes('--reseed');

const needsSsl = /sslmode=require|\.ondigitalocean\.com|\.neon\.tech|\.supabase\./i.test(url);
const pool = new pg.Pool({
  connectionString: url,
  ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
  max: 5,
});

async function main() {
  // 1. Apply the schema (multi-statement; idempotent CREATE … IF NOT EXISTS).
  const schema = fs.readFileSync(path.join(root, 'lib', 'schema.pg.sql'), 'utf8');
  console.log('📋 Applying lib/schema.pg.sql …');
  await pool.query(schema);
  console.log('  ✓ schema applied');

  // 2. Admin user (from env; hash is self-contained/portable across hosts).
  const email = (process.env.ADMIN_EMAIL || 'admin@indianwasteportal.in').toLowerCase().trim();
  const pw    = process.env.ADMIN_PASSWORD || 'admin@123';
  const hash  = hashPassword(pw);
  const ex = await pool.query('SELECT id FROM admin_users WHERE email = $1', [email]);
  if (ex.rows.length) {
    await pool.query('UPDATE admin_users SET password_hash = $1 WHERE email = $2', [hash, email]);
    console.log(`👤 admin updated: ${email}`);
  } else {
    await pool.query(
      'INSERT INTO admin_users (id, email, password_hash, role) VALUES ($1,$2,$3,$4)',
      [randomUUID(), email, hash, 'superadmin']);
    console.log(`👤 admin created: ${email}`);
  }

  // 3. Example pricing (only if the book is empty).
  const pc = await pool.query('SELECT COUNT(*)::int AS c FROM pricing_rules');
  if (pc.rows[0].c === 0) {
    const seed = [['Hospital', 'Urban', 299900], ['Big Hospital', 'Urban', 699900], ['Industry', 'Any', 1000000]];
    for (const [t, l, a] of seed)
      await pool.query('INSERT INTO pricing_rules (id, est_type, location, amount_paise) VALUES ($1,$2,$3,$4)',
        [randomUUID(), t, l, a]);
    console.log(`💰 seeded ${seed.length} example pricing rules`);
  }

  // 4. Pincode directory (optional, large).
  if (doPincodes) await seedPincodes();

  console.log('\n✅ PostgreSQL database ready.');
  if (!doPincodes) console.log('   Tip: re-run with --pincodes to load the LGD pincode directory.');
}

async function seedPincodes() {
  const existing = await pool.query('SELECT COUNT(*)::int AS c FROM pincode_directory');
  if (existing.rows[0].c > 0 && !reseed) {
    console.log(`📮 pincode_directory already has ${existing.rows[0].c} rows — skipping (use --reseed to replace).`);
    return;
  }
  const csvPath = path.join(root, 'public', 'mosaic', 'all-india-pincode-2025.csv');
  if (!fs.existsSync(csvPath)) {
    console.error(`⚠️  pincode CSV not found at ${csvPath} — skipping pincode seed.`);
    return;
  }
  if (reseed) { await pool.query('TRUNCATE pincode_directory RESTART IDENTITY'); console.log('📮 cleared existing pincode_directory'); }

  console.log('📮 loading pincode directory (batched) …');
  const parser = fs.createReadStream(csvPath).pipe(parse({ columns: true, skip_empty_lines: true }));
  let batch = [], total = 0;
  const flush = async () => {
    if (!batch.length) return;
    // Build a multi-row parameterized INSERT: VALUES ($1,$2,..),($8,$9,..),…
    const cols = 7;
    const values = [];
    const params = [];
    batch.forEach((r, i) => {
      const b = i * cols;
      values.push(`($${b+1},$${b+2},$${b+3},$${b+4},$${b+5},$${b+6},$${b+7})`);
      params.push(r.statename, r.district, r.divisionname, r.officename, r.pincode, r.latitude, r.longitude);
    });
    await pool.query(
      `INSERT INTO pincode_directory (statename,district,divisionname,officename,pincode,latitude,longitude) VALUES ${values.join(',')}`,
      params);
    total += batch.length;
    if (total % 20000 < batch.length) console.log(`   … ${total} rows`);
    batch = [];
  };

  for await (const row of parser) {
    if (!row.statename || !row.district || !row.officename || !row.pincode) continue;
    batch.push({
      statename:    String(row.statename).trim().toUpperCase(),
      district:     String(row.district).trim().toUpperCase(),
      divisionname: String(row.divisionname || row.regionname || row.district).trim().toUpperCase(),
      officename:   String(row.officename).trim(),
      pincode:      String(row.pincode).trim(),
      latitude:     String(row.latitude  || ''),
      longitude:    String(row.longitude || ''),
    });
    if (batch.length >= 1000) await flush();
  }
  await flush();
  console.log(`📮 pincode_directory: ${total} rows loaded`);
}

main()
  .catch(err => { console.error('❌ init-postgres failed:', err.message); process.exitCode = 1; })
  .finally(() => pool.end());
