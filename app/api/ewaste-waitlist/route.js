import { NextResponse } from 'next/server';
import { getDb, Q }     from '../../../lib/d1-db';
import { randomUUID }   from 'crypto';

export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });

    const db = getDb(request);

    // Generate a unique discount code
    const discountCode = 'EWASTE20-' + randomUUID().slice(0, 8).toUpperCase();

    await db.run(...Q.insertWaitlist(
      randomUUID(),
      email.toLowerCase().trim(),
      discountCode,
    ));

    return NextResponse.json({
      success: true,
      message: 'Added to E-Waste waitlist',
      discount_code: discountCode,
    });

  } catch (err) {
    // SQLite UNIQUE constraint = already registered
    if (err.message?.includes('UNIQUE constraint failed')) {
      return NextResponse.json({ success: true, message: 'Already on the waitlist!' });
    }
    console.error('[/api/ewaste-waitlist] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
