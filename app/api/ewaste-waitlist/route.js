import { NextResponse } from 'next/server';
import { getDb, Q }     from '../../../lib/d1-db';
import { randomUUID }   from 'crypto';

export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });

    const db = getDb(request);
    const cleanEmail = email.toLowerCase().trim();

    // One waitlist entry per email. Repeat submits are a no-op (idempotent).
    const existing = await db.get('SELECT id FROM ewaste_waitlist WHERE email = ?', [cleanEmail]);
    if (existing) {
      return NextResponse.json({ success: true, already: true });
    }

    await db.run(...Q.insertWaitlist(randomUUID(), cleanEmail, null));
    return NextResponse.json({ success: true, already: false });

  } catch (err) {
    console.error('[/api/ewaste-waitlist] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
