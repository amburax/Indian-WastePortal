/**
 * Lightweight, dependency-free error reporting.
 *
 * Always writes a structured error line (visible in Vercel / Cloudflare / PM2
 * logs). If ERROR_WEBHOOK_URL is set (Slack / Discord / any JSON webhook), it
 * also fires a best-effort POST so you get alerted without a full APM. Never
 * throws — reporting must not break the request it's reporting on.
 *
 *   import { reportError } from '@/lib/observability';
 *   catch (err) { reportError(err, { route: 'POST /api/register' }); ... }
 */
export function reportError(err, context = {}) {
  const e = err instanceof Error ? err : new Error(String(err));
  const entry = {
    level: 'error',
    ts:    new Date().toISOString(),
    message: e.message,
    ...context,
  };

  // Structured line + full stack (kept separate so the JSON stays greppable).
  try { console.error('[error]', JSON.stringify(entry), '\n', e.stack); }
  catch { console.error('[error]', e); }

  const url = process.env.ERROR_WEBHOOK_URL;
  if (url) {
    const text = `🔴 ${entry.message}${context.route ? `  ·  ${context.route}` : ''}`;
    // Fire-and-forget; `text` suits Slack/Discord, the rest carries detail.
    try {
      fetch(url, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ text, ...entry, stack: e.stack }),
      }).catch(() => {});
    } catch { /* fetch unavailable — structured log above is enough */ }
  }
  return entry;
}
