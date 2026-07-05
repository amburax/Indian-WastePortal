/**
 * Rate limiter — one place for all throttling.
 *
 * Backed by the database (a `rate_limits` fixed-window counter table), so the
 * limit is SHARED across every process/instance — correct behind PM2 cluster
 * mode or multiple DigitalOcean droplets, where an in-memory Map would give each
 * worker its own counter and make the limit trivially bypassable.
 *
 * Uses one atomic UPSERT per hit (works identically on SQLite, Turso, D1 and
 * Postgres via the app's SQL translator). Fails OPEN: if the store errors, the
 * request is allowed rather than blocking legitimate users on an infra hiccup.
 */
import { getDb } from './d1-db';

/**
 * @param {Request} request  the incoming request (used to resolve the DB binding)
 * @param {string}  key      scoped key, e.g. `login:<ip>:<email>`
 * @returns {Promise<{ limited: boolean, remaining: number }>}
 */
export async function rateLimit(request, key, { max = 8, windowMs = 60_000 } = {}) {
  const windowSec = Math.max(1, Math.ceil(windowMs / 1000));
  try {
    const db = getDb(request);

    // Fixed-window counter. On each hit: if the stored window has expired, reset
    // to 1; otherwise increment. RETURNING gives us the post-increment count in
    // a single round-trip. `datetime('now', …)` is translated to Postgres NOW().
    const row = await db.get(
      `INSERT INTO rate_limits (key, hits, window_start)
         VALUES (?, 1, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET
         hits = CASE WHEN rate_limits.window_start < datetime('now','-${windowSec} seconds')
                     THEN 1 ELSE rate_limits.hits + 1 END,
         window_start = CASE WHEN rate_limits.window_start < datetime('now','-${windowSec} seconds')
                     THEN datetime('now') ELSE rate_limits.window_start END
       RETURNING hits`,
      [key]
    );
    const hits = Number(row?.hits ?? 1);

    // Opportunistic cleanup so the table can't grow unbounded from one-off keys.
    if (Math.random() < 0.02) {
      try { await db.run("DELETE FROM rate_limits WHERE window_start < datetime('now','-1 day')", []); } catch {}
    }

    return { limited: hits > max, remaining: Math.max(0, max - hits) };
  } catch (e) {
    console.warn('[ratelimit] fail-open (store error):', e.message);
    return { limited: false, remaining: max };
  }
}

/** Best-effort client IP from proxy headers (falls back to 'unknown'). */
export function clientIp(request) {
  return (request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown').split(',')[0].trim();
}
