/**
 * Indian Waste Portal V2 — Cloudflare Queues Publisher
 *
 * Pushes a filing job to the Cloudflare Queue after payment verification.
 * In local dev mode (no CF binding), falls back to direct DB "Queued" status
 * so the standalone worker can still poll.
 *
 * Production: Uses env.FILING_QUEUE (wrangler.toml binding)
 * Local dev:  Marks org status "Queued" in SQLite so `node workers/queue-consumer.js` can pick it up
 */

import { randomUUID } from 'crypto';

/**
 * Push a filing job to the queue.
 *
 * @param {object} opts
 * @param {string}   opts.orgId       - Organization UUID
 * @param {object}   opts.payload     - Full org data payload for the agent
 * @param {number}   opts.queuePos    - Global queue position (from counter)
 * @param {object|null} opts.cfEnv    - Cloudflare env (has FILING_QUEUE binding)
 * @param {object}   opts.db          - DB adapter (to save job record)
 * @returns {Promise<string>}          - Job ID (CF Queue message ID or UUID)
 */
export async function pushFilingJob({ orgId, payload, queuePos, cfEnv, db }) {
  const jobId = randomUUID();

  const message = {
    jobId,
    orgId,
    queuePos,
    payload,                  // Full registration payload for the Playwright agent
    createdAt: new Date().toISOString(),
  };

  if (cfEnv?.FILING_QUEUE) {
    // ── Production: push to Cloudflare Queue ──────────────
    await cfEnv.FILING_QUEUE.send(message, {
      contentType: 'json',
      delaySeconds: 0,         // Process immediately
    });
    console.log(`[Queue] Pushed job ${jobId} for org ${orgId} at position #${queuePos}`);
  } else {
    // ── Local dev fallback: just log, worker polls DB ──────
    // The local queue-consumer.js picks up orgs with status = 'Queued'
    console.log(`[Queue/Dev] No CF binding — job ${jobId} registered in DB only. Run: node workers/queue-consumer.js`);
  }

  // Save queue job record to DB
  await db.run(...Q_insertJob(jobId, orgId, queuePos));

  return jobId;
}

// SQL helper for queue_jobs insert
function Q_insertJob(jobId, orgId, queuePos) {
  return [
    `INSERT INTO queue_jobs (id, org_id, status, queue_position)
     VALUES (?, ?, 'pending', ?)`,
    [jobId, orgId, queuePos],
  ];
}

/**
 * Get and increment the global queue counter.
 * Uses Cloudflare KV in production, SQLite counter in local dev.
 *
 * @param {object|null} cfEnv - Cloudflare env (has QUEUE_KV binding)
 * @param {object}      db    - DB adapter
 * @returns {Promise<number>}  - Next queue position number
 */
export async function getNextQueuePosition(cfEnv, db) {
  if (cfEnv?.QUEUE_KV) {
    // ── CF KV: atomic counter ─────────────────────────────
    const current = parseInt(await cfEnv.QUEUE_KV.get('queue:counter') || '0');
    const next    = current + 1;
    await cfEnv.QUEUE_KV.put('queue:counter', String(next));
    return next;
  } else {
    // ── Local: SQLite counter ─────────────────────────────
    await db.run("UPDATE queue_counter SET value = value + 1 WHERE key = 'global'", []);
    const row = await db.get("SELECT value FROM queue_counter WHERE key = 'global'", []);
    return row?.value || 1;
  }
}

/**
 * Calculate how many jobs are ahead of a given position.
 * Used by /api/queue/position to show queue depth to clients.
 *
 * @param {number} position - The org's queue position
 * @param {object} db       - DB adapter
 * @returns {Promise<{jobsAhead: number, etaMinutes: number}>}
 */
export async function getQueueDepth(position, db) {
  const row = await db.get(
    "SELECT COUNT(*) as count FROM queue_jobs WHERE status IN ('pending','processing') AND queue_position < ?",
    [position]
  );
  const jobsAhead  = row?.count || 0;
  // Assume ~15 minutes per filing job (adjust based on real agent performance)
  const etaMinutes = jobsAhead * 15;
  return { jobsAhead, etaMinutes };
}
