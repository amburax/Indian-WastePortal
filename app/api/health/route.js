import { NextResponse } from 'next/server';
import { getDb } from '../../../lib/d1-db';

/**
 * GET /api/health — liveness + operational signals for uptime monitors.
 *
 * Public (no PII): pings the DB and reports counts that indicate something is
 * wrong — submissions stuck mid-filing, failures, or ones flagged for attention.
 * Returns 200 when healthy, 503 when the DB is unreachable. `status` is
 * "ok" | "degraded" | "down" so a monitor can alert on non-ok.
 */
export async function GET(request) {
  const t0 = Date.now();
  const out = { status: 'ok', time: new Date().toISOString() };
  try {
    const db = getDb(request);
    await db.get('SELECT 1 AS ok', []);
    out.db = 'up';

    const q = (sql) => db.get(sql, []).then(r => r?.c || 0).catch(() => 0);
    const [needs, failed, stuck] = await Promise.all([
      q("SELECT COUNT(*) c FROM organizations WHERE status = 'NeedsAttention' AND archived = 0"),
      q("SELECT COUNT(*) c FROM organizations WHERE status = 'Failed' AND archived = 0"),
      q("SELECT COUNT(*) c FROM organizations WHERE status = 'In Progress' AND archived = 0 AND updated_at < datetime('now','-6 hours')"),
    ]);
    out.signals = { needs_attention: needs, failed, stuck_in_progress: stuck };
    out.status = (failed > 0 || stuck > 0) ? 'degraded' : 'ok';
    out.latency_ms = Date.now() - t0;
    return NextResponse.json(out, { status: 200 });
  } catch (e) {
    out.status = 'down';
    out.db = 'down';
    out.error = e.message;
    out.latency_ms = Date.now() - t0;
    return NextResponse.json(out, { status: 503 });
  }
}
