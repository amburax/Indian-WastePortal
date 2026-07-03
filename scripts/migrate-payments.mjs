/**
 * Track 4 migration — two-part payment (retainer + balance invoice).
 * Idempotent. Run: node --env-file=.env.local scripts/migrate-payments.mjs
 */
import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = process.env.DATABASE_PATH || './indianwasteportal.db';
const db = new Database(path.resolve(process.cwd(), DB_PATH));
console.log('🛠  Migrating (payments):', path.resolve(process.cwd(), DB_PATH));

function addColumn(table, col, def) {
  try { db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${def};`); console.log(`  + ${table}.${col}`); }
  catch (e) { if (/duplicate column/i.test(e.message)) console.log(`  · ${table}.${col} (exists)`); else throw e; }
}

// payments: distinguish retainer vs balance vs full
addColumn('payments', 'kind', "TEXT NOT NULL DEFAULT 'full'");   // retainer | balance | full

// organizations: retainer + balance-invoice tracking
addColumn('organizations', 'retainer_paid',           'INTEGER NOT NULL DEFAULT 0');
addColumn('organizations', 'balance_amount_paise',    'INTEGER');
addColumn('organizations', 'balance_invoice_url',     'TEXT');
addColumn('organizations', 'balance_payment_link_id', 'TEXT');

db.close();
console.log('✅ Payments migration complete.');
