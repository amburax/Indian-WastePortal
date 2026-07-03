/**
 * Annual SWM-return reminder — emails + WhatsApps registered clients before the
 * next 30 June deadline. Idempotent per deadline-year (won't double-send).
 *
 * Schedule daily (PM2 cron or OS cron):
 *   node --env-file=.env.local scripts/send-reminders.mjs
 * Test any time (bypasses the date window):
 *   node --env-file=.env.local scripts/send-reminders.mjs --force
 *
 * REMINDER_WINDOW_DAYS (default 45) — how many days before 30 June to start.
 */
import Database from 'better-sqlite3';
import path from 'path';
import { sendEmail, reminderEmail } from '../lib/email.js';
import { sendNotification } from '../lib/notify.js';

const FORCE  = process.argv.includes('--force');
const WINDOW = parseInt(process.env.REMINDER_WINDOW_DAYS || '45', 10);
const db = new Database(path.resolve(process.cwd(), process.env.DATABASE_PATH || './indianwasteportal.db'));
const adapter = {
  async get(sql, p = []) { return db.prepare(sql).get(...p) || null; },
  async run(sql, p = []) { return db.prepare(sql).run(...p); },
};

const now = new Date();
let deadline = new Date(now.getFullYear(), 5, 30, 23, 59, 59);      // 30 Jun this year
if (now > deadline) deadline = new Date(now.getFullYear() + 1, 5, 30, 23, 59, 59);
const daysToDeadline = Math.ceil((deadline - now) / 86400000);
const year = deadline.getFullYear();
const deadlineLabel = deadline.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
const base = process.env.APP_BASE_URL || 'https://indianwasteportal.in';

console.log(`Reminders: ${daysToDeadline} day(s) to ${deadlineLabel} · window ${WINDOW}d · force=${FORCE}`);
if (daysToDeadline > WINDOW && !FORCE) {
  console.log('Outside the reminder window — nothing to send. Use --force to override.');
  db.close(); process.exitCode = 0;
} else {
  const orgs = db.prepare("SELECT id, org_name, email, payment_token FROM organizations WHERE email IS NOT NULL AND email != ''").all();
  let sent = 0, skipped = 0;
  for (const o of orgs) {
    const already = db.prepare("SELECT 1 FROM notifications WHERE org_id = ? AND type = 'annual_reminder' AND payload LIKE ? LIMIT 1").get(o.id, `%${year}%`);
    if (already) { skipped++; continue; }
    try {
      await sendEmail({ to: o.email, ...reminderEmail({ orgName: o.org_name, deadlineLabel, token: o.payment_token }) });
      await sendNotification(adapter, {
        orgId: o.id, channel: 'whatsapp', type: 'annual_reminder',
        payload: `Reminder: your SWM annual return is due by ${deadlineLabel}. File/track: ${base}/status/${o.payment_token}`,
      });
      sent++;
    } catch (e) { console.warn(`  ${o.email}: ${e.message}`); }
  }
  console.log(`✅ sent=${sent} · skipped(already reminded for ${year})=${skipped}`);
  db.close(); process.exitCode = 0;
}
