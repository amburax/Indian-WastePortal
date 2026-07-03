/**
 * ═══════════════════════════════════════════════════════════════
 *  Indian Waste Portal V2 — Queue Consumer Worker
 *  File: workers/queue-consumer.js
 *
 *  This is a standalone Node.js process that runs on a VPS/server.
 *  It is NOT a Next.js route — it's a background daemon.
 *
 *  Run: node workers/queue-consumer.js
 *  PM2: pm2 start workers/queue-consumer.js --name iwp-agent
 *
 *  Architecture:
 *   ┌─────────────────────────────────────────────────────┐
 *   │  In PRODUCTION (Cloudflare Queue):                  │
 *   │  Uses CF Queue HTTP Pull API to fetch messages,     │
 *   │  then calls runFilingAgent() for each message,     │
 *   │  then ACKs the message to remove it from queue.    │
 *   │                                                     │
 *   │  In LOCAL DEV (no CF Queue):                        │
 *   │  Polls SQLite DB for orgs with status='Queued',    │
 *   │  runs the Playwright agent, updates status in DB.  │
 *   └─────────────────────────────────────────────────────┘
 *
 *  The agent respects exponential backoff on failures.
 *  Max retries: 3. After that, status → 'Failed'.
 * ═══════════════════════════════════════════════════════════════
 */

import { runFilingAgent }  from './playwright-agent.js';
import Database            from 'better-sqlite3';
import path                from 'path';
import fs                  from 'fs';
import { fileURLToPath }   from 'url';
import { randomUUID }      from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Config ────────────────────────────────────────────────────
const DB_PATH        = process.env.DATABASE_PATH || './indianwasteportal.db';
const CF_ACCOUNT_ID  = process.env.CF_ACCOUNT_ID;
const CF_API_TOKEN   = process.env.CF_API_TOKEN;
const CF_QUEUE_ID    = process.env.CF_QUEUE_ID;
const POLL_MS        = parseInt(process.env.POLL_INTERVAL_MS || '10000');  // 10 seconds
const BATCH_SIZE     = parseInt(process.env.AGENT_BATCH_SIZE || '3');       // jobs per poll
const MAX_RETRIES    = 3;

// ── DB singleton ──────────────────────────────────────────────
let _db = null;
function getDb() {
  if (_db) return _db;
  const SCHEMA_PATH = path.join(__dirname, '..', 'lib', 'schema.sql');
  const dbPath      = path.resolve(process.cwd(), DB_PATH);

  if (!fs.existsSync(dbPath)) {
    console.error(`❌ Database not found at ${dbPath}. Run: node scripts/init-db.js`);
    process.exit(1);
  }
  _db = new Database(dbPath);
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');
  return _db;
}

// ── Logger (writes to agent_logs table + console) ─────────────
function makeLogger(db, orgId, jobId) {
  return {
    log(step, status, message, screenshot = null) {
      const entry = { id: randomUUID(), org_id: orgId, job_id: jobId, step, status, message, screenshot };
      console.log(`[Agent][${step}][${status}] ${message}`);
      try {
        db.prepare(`
          INSERT INTO agent_logs (id, org_id, job_id, step, status, message, screenshot)
          VALUES (@id, @org_id, @job_id, @step, @status, @message, @screenshot)
        `).run(entry);
      } catch (e) {
        console.error('Log write error:', e.message);
      }
    },
  };
}

// ════════════════════════════════════════════════════════════
//  CLOUDFLARE QUEUE HTTP PULL (Production)
//  Uses the CF Queues REST API to pull and ACK messages.
// ════════════════════════════════════════════════════════════
async function pullFromCFQueue() {
  const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/queues/${CF_QUEUE_ID}/messages/pull`;
  const res  = await fetch(url, {
    method:  'POST',
    headers: {
      'Authorization': `Bearer ${CF_API_TOKEN}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({ batch_size: BATCH_SIZE, visibility_timeout_ms: 300_000 }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`CF Queue pull failed: ${res.status} — ${err}`);
  }

  const data = await res.json();
  return data.result?.messages || [];
}

async function ackCFQueueMessage(leaseId) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/queues/${CF_QUEUE_ID}/messages/ack`;
  await fetch(url, {
    method:  'POST',
    headers: {
      'Authorization': `Bearer ${CF_API_TOKEN}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({ acks: [{ lease_id: leaseId }], retries: [] }),
  });
}

async function nakCFQueueMessage(leaseId, delaySeconds = 60) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/queues/${CF_QUEUE_ID}/messages/ack`;
  await fetch(url, {
    method:  'POST',
    headers: {
      'Authorization': `Bearer ${CF_API_TOKEN}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({ acks: [], retries: [{ lease_id: leaseId, delay_seconds: delaySeconds }] }),
  });
}

// ════════════════════════════════════════════════════════════
//  LOCAL DEV POLLING (DB-based)
// ════════════════════════════════════════════════════════════
function pollLocalDb(db) {
  // Pick orgs that an admin has RELEASED to the queue (status='Queued').
  // 'Paid' orgs are intentionally NOT picked up — filing only begins after an
  // admin presses Start Filing (Gate 2 of the two-gate model).
  return db.prepare(`
    SELECT o.*, qj.id as job_id, qj.attempt_count, qj.status as job_status
    FROM organizations o
    LEFT JOIN queue_jobs qj ON qj.org_id = o.id AND qj.status IN ('pending', 'failed')
    WHERE o.status = 'Queued'
    ORDER BY o.queue_position ASC
    LIMIT ?
  `).all(BATCH_SIZE);
}

function getFullPayload(db, orgId) {
  const org     = db.prepare('SELECT * FROM organizations WHERE id = ?').get(orgId);
  const metrics = db.prepare('SELECT * FROM metrics WHERE org_id = ?').get(orgId);
  const address = db.prepare('SELECT * FROM lgd_addresses WHERE org_id = ?').get(orgId);

  return {
    org_id:               org.id,
    org_name:             org.org_name,
    auth_person:          org.auth_person,
    email:                org.email,
    phone:                org.phone,
    category:             org.category,
    sub_category:         org.sub_category,
    floor_area_sqm:       metrics?.floor_area_sqm        || 0,
    waste_kg_per_day:     metrics?.waste_kg_per_day      || 0,
    water_liters_per_day: metrics?.water_liters_per_day  || 0,
    state_name:           address?.state_name            || '',
    district_name:        address?.district_name         || '',
    sub_district:         address?.sub_district          || '',
    city_name:            address?.city_name             || '',
    full_address:         address?.full_address          || '',
    zone_ward:            address?.zone_ward             || '',
    local_body_type:      address?.local_body_type       || '',
    local_body_name:      address?.local_body_name       || '',   // no column yet → agent falls back to first option
    pincode:              address?.pincode               || '',
    latitude:             address?.latitude              || null,
    longitude:            address?.longitude             || null,
  };
}

// ════════════════════════════════════════════════════════════
//  PROCESS SINGLE JOB
// ════════════════════════════════════════════════════════════
async function processJob(db, orgId, jobId, payload, attemptCount) {
  const logger = makeLogger(db, orgId, jobId);

  // Mark org + job as In Progress
  db.prepare("UPDATE organizations SET status = 'In Progress' WHERE id = ?").run(orgId);
  if (jobId) {
    db.prepare("UPDATE queue_jobs SET status = 'processing', started_at = datetime('now'), attempt_count = attempt_count + 1 WHERE id = ?")
      .run(jobId);
  }

  logger.log('preflight', 'success', `Starting attempt #${(attemptCount || 0) + 1} for org: ${payload.org_name}`);

  try {
    // ── Run the 5-step Playwright agent ─────────────────
    const { ackNumber, portalStatus } = await runFilingAgent(payload, logger, db, jobId);

    // ── Success: update org + job ────────────────────────
    db.prepare(`
      UPDATE organizations
      SET status = 'Completed', ack_number = ?, portal_status = ?,
          completed_at = datetime('now')
      WHERE id = ?
    `).run(ackNumber, portalStatus, orgId);

    if (jobId) {
      db.prepare("UPDATE queue_jobs SET status = 'done', completed_at = datetime('now') WHERE id = ?")
        .run(jobId);
    }

    // Deliver the ACK number to the client (WhatsApp row + email).
    try {
      db.prepare("INSERT INTO notifications (id, org_id, channel, type, status, payload) VALUES (?,?,?,?,?,?)")
        .run(randomUUID(), orgId, 'whatsapp', 'ack_delivered', 'queued',
             `Your CPCB SWM registration is complete. Acknowledgement number: ${ackNumber}. Keep it for annual returns and inspections.`);
      if (payload.email) {
        const { sendEmail, ackEmail } = await import('../lib/email.js');
        await sendEmail({ to: payload.email, ...ackEmail({ orgName: payload.org_name, ackNumber, portalStatus }) });
      }
    } catch (e) { logger.log('complete', 'success', `ACK notify skipped: ${e.message}`); }

    logger.log('complete', 'success', `✅ DONE! ACK: ${ackNumber} | Portal: ${portalStatus}`);
    return { success: true, ackNumber };

  } catch (err) {
    logger.log('error', 'error', `Agent error: ${err.message}`);

    // OTP lockout: the agent already set the job to 'failed' + org to
    // 'NeedsAttention'. Do NOT auto-retry or overwrite — an admin must Reset.
    if (err && err.code === 'OTP_LOCKOUT') {
      logger.log('error', 'error', '🔒 OTP lockout — flagged NeedsAttention for admin. No auto-retry.');
      return { success: false, error: err.message };
    }

    const newAttempt = (attemptCount || 0) + 1;
    if (newAttempt >= MAX_RETRIES) {
      // Max retries exceeded — mark as Failed
      db.prepare("UPDATE organizations SET status = 'Failed' WHERE id = ?").run(orgId);
      if (jobId) {
        db.prepare("UPDATE queue_jobs SET status = 'failed', last_error = ?, completed_at = datetime('now') WHERE id = ?")
          .run(err.message, jobId);
      }
      try {
        db.prepare("INSERT INTO notifications (id, org_id, channel, type, status, payload) VALUES (?,?,?,?,?,?)")
          .run(randomUUID(), orgId, 'whatsapp', 'needs_attention', 'queued',
               'Your CPCB filing hit an error and needs review. Our consultant will contact you shortly.');
      } catch { /* non-fatal */ }
      logger.log('error', 'error', `❌ Max retries (${MAX_RETRIES}) exceeded — status → Failed`);
    } else {
      // Revert to Queued for retry
      db.prepare("UPDATE organizations SET status = 'Queued' WHERE id = ?").run(orgId);
      if (jobId) {
        db.prepare("UPDATE queue_jobs SET status = 'pending', last_error = ? WHERE id = ?")
          .run(err.message, jobId);
      }
      logger.log('error', 'success', `Retrying (attempt ${newAttempt}/${MAX_RETRIES}) after backoff…`);
    }

    return { success: false, error: err.message };
  }
}

// ════════════════════════════════════════════════════════════
//  MAIN LOOP
// ════════════════════════════════════════════════════════════
async function main() {
  // Treat unset OR placeholder ("REPLACE_WITH_…") credentials as not configured,
  // so local dev falls back to DB polling instead of trying a fake CF Queue.
  const isReal     = (v) => !!v && !v.startsWith('REPLACE_WITH');
  const useCFQueue = isReal(CF_ACCOUNT_ID) && isReal(CF_API_TOKEN) && isReal(CF_QUEUE_ID);
  const db         = getDb();

  console.log(`\n╔════════════════════════════════════════╗`);
  console.log(`║  Indian Waste Portal — Queue Consumer Worker ║`);
  console.log(`╠════════════════════════════════════════╣`);
  console.log(`║  Mode:     ${useCFQueue ? 'Cloudflare Queue (Production)' : 'Local DB polling (Dev)   '}`);
  console.log(`║  Demo:     ${process.env.AGENT_DEMO_MODE === 'true' ? 'YES — synthetic ACK        ' : 'NO — real portal filing    '}`);
  console.log(`║  Headless: ${process.env.AGENT_HEADLESS !== 'false' ? 'YES                        ' : 'NO (visible browser)       '}`);
  console.log(`║  Poll:     every ${POLL_MS / 1000}s, batch size ${BATCH_SIZE}`);
  console.log(`╚════════════════════════════════════════╝\n`);

  // Graceful shutdown
  process.on('SIGINT',  () => { console.log('\n[Worker] SIGINT — shutting down gracefully'); db.close(); process.exit(0); });
  process.on('SIGTERM', () => { console.log('\n[Worker] SIGTERM — shutting down gracefully'); db.close(); process.exit(0); });

  while (true) {
    try {
      if (useCFQueue) {
        // ── Production: CF Queue pull ───────────────────
        const messages = await pullFromCFQueue();
        if (messages.length > 0) {
          console.log(`\n[Worker] Pulled ${messages.length} job(s) from CF Queue`);
        }

        for (const msg of messages) {
          const { orgId, jobId, payload } = msg.body || msg;
          const leaseId = msg.lease_id;

          console.log(`[Worker] Processing job: ${jobId} (org: ${orgId})`);
          const result = await processJob(db, orgId, jobId, payload, 0);

          if (result.success) {
            await ackCFQueueMessage(leaseId);
          } else {
            // NAK with 60s delay for retry
            await nakCFQueueMessage(leaseId, 60);
          }
        }

      } else {
        // ── Local dev: DB polling ───────────────────────
        const orgs = pollLocalDb(db);
        if (orgs.length > 0) {
          console.log(`\n[Worker] Found ${orgs.length} queued org(s)`);
        }

        for (const org of orgs) {
          const payload      = getFullPayload(db, org.id);
          const jobId        = org.job_id || randomUUID();
          const attemptCount = org.attempt_count || 0;

          console.log(`[Worker] Processing org: ${org.org_name} (${org.id})`);
          await processJob(db, org.id, jobId, payload, attemptCount);
        }
      }

    } catch (err) {
      console.error('[Worker] Poll cycle error:', err.message);
    }

    // Wait before next poll
    await new Promise(r => setTimeout(r, POLL_MS));
  }
}

// ── Entry point ───────────────────────────────────────────────
main().catch(err => {
  console.error('[Worker] Fatal startup error:', err);
  process.exit(1);
});
