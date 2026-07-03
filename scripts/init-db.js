/**
 * Indian Waste Portal — Database Initializer
 * Run once: `npm run init-db`
 * Creates the SQLite file and applies the full schema.
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DATABASE_PATH || './indianwasteportal.db';
const SCHEMA_PATH = path.join(__dirname, '..', 'lib', 'schema.sql');

const dbPath = path.resolve(process.cwd(), DB_PATH);
console.log('🏦 Indian Waste Portal DB Initializer');
console.log('📁 DB path:', dbPath);

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');

try {
  db.exec(schema);
  console.log('✅ Schema applied successfully!');

  // Verify tables
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log('📊 Tables created:', tables.map(t => t.name).join(', '));

  db.close();
  console.log('🎉 Indian Waste Portal DB ready!');
} catch (err) {
  console.error('❌ Schema error:', err.message);
  process.exit(1);
}
