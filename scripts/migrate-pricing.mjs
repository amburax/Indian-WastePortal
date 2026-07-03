/**
 * Price-book migration — establishment-type × location pricing rules.
 * Idempotent. Run: node --env-file=.env.local scripts/migrate-pricing.mjs
 */
import Database from 'better-sqlite3';
import path from 'path';
import { randomUUID } from 'crypto';

const db = new Database(path.resolve(process.cwd(), process.env.DATABASE_PATH || './indianwasteportal.db'));
console.log('🛠  Migrating (pricing)…');

db.exec(`
CREATE TABLE IF NOT EXISTS pricing_rules (
  id           TEXT PRIMARY KEY,
  est_type     TEXT NOT NULL,                 -- Hospital | Big Hospital | Industry | Hotel | …
  location     TEXT NOT NULL DEFAULT 'Any',   -- Metro | Urban | Rural | <state/city> | Any
  amount_paise INTEGER NOT NULL,              -- full one-time fee (INR × 100)
  active       INTEGER NOT NULL DEFAULT 1,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_pricing_active ON pricing_rules(active);
`);
console.log('  + table pricing_rules');

// Seed example rules only if the book is empty (you edit these in the admin UI).
const count = db.prepare('SELECT COUNT(*) c FROM pricing_rules').get().c;
if (count === 0) {
  const seed = [
    ['Hospital',     'Urban', 299900],   // ₹2,999
    ['Big Hospital', 'Urban', 699900],   // ₹6,999
    ['Industry',     'Any',  1000000],   // ₹10,000
  ];
  const ins = db.prepare('INSERT INTO pricing_rules (id, est_type, location, amount_paise) VALUES (?,?,?,?)');
  for (const [t, l, a] of seed) ins.run(randomUUID(), t, l, a);
  console.log(`  + seeded ${seed.length} example rules`);
} else {
  console.log(`  · ${count} rules already present — no seed`);
}

db.close();
console.log('✅ Pricing migration complete.');
