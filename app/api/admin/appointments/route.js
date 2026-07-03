import { NextResponse } from 'next/server';
import { getDb }    from '../../../../lib/d1-db';
import { getAdmin } from '../../../../lib/admin-auth';

/**
 * GET /api/admin/appointments
 * All orgs with a booked consultant slot (appointment_at set), for the calendar.
 */
export async function GET(request) {
  const admin = getAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const db = getDb(request);
    const rows = await db.all(`
      SELECT id, org_name, phone, status, appointment_at, assigned_admin, consultant_notes
      FROM organizations
      WHERE appointment_at IS NOT NULL AND appointment_at != ''
      ORDER BY appointment_at ASC
    `, []);
    return NextResponse.json({ appointments: rows });
  } catch (err) {
    console.error('[/api/admin/appointments]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
