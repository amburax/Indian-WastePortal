/**
 * Rate limiter — one place for all throttling.
 *
 * Default store is in-memory (per process): correct for a single instance or
 * local dev, but NOT shared across serverless/edge instances. To make it work
 * multi-instance, reimplement `hit()` against Upstash Redis (INCR + EXPIRE) —
 * the call sites (`rateLimit(...)`) don't change.
 */
const _store = new Map();

/** Returns { limited, remaining }. `key` should be scoped, e.g. `login:<email>`. */
export function rateLimit(key, { max = 8, windowMs = 60_000 } = {}) {
  const now = Date.now();
  const arr = (_store.get(key) || []).filter(t => now - t < windowMs);
  arr.push(now);
  _store.set(key, arr);
  // opportunistic cleanup so the map doesn't grow unbounded
  if (_store.size > 5000) for (const [k, v] of _store) if (!v.some(t => now - t < windowMs)) _store.delete(k);
  return { limited: arr.length > max, remaining: Math.max(0, max - arr.length) };
}

/** Best-effort client IP from proxy headers (falls back to 'unknown'). */
export function clientIp(request) {
  return (request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown').split(',')[0].trim();
}
