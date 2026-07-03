import { NextResponse } from 'next/server';
import { reportError }  from '../../../lib/observability';
import { rateLimit, clientIp } from '../../../lib/ratelimit';

/**
 * POST /api/client-error
 * Receives a crash report from the client error boundary and funnels it through
 * the same reporter as server errors (structured log + optional webhook alert).
 * Rate-limited so a looping client can't flood it. Always returns ok.
 */
export async function POST(request) {
  try {
    if (rateLimit(`clienterr:${clientIp(request)}`, { max: 20, windowMs: 60_000 }).limited)
      return NextResponse.json({ ok: true });

    const { message, stack, digest, url } = await request.json().catch(() => ({}));
    const err = new Error(String(message || 'Client error'));
    if (stack) err.stack = stack;
    reportError(err, { route: 'client', digest, url });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
