import { getDb }    from '../../../../lib/d1-db';
import { getAdmin } from '../../../../lib/admin-auth';

/**
 * GET /api/admin/export — download all submissions as CSV.
 */
const EXPORT_COLS = [
  'org_name', 'auth_person', 'email', 'phone', 'category', 'sub_category', 'plan',
  'status', 'retainer_paid', 'payment_verified', 'balance_amount_paise', 'ack_number',
  'assigned_admin', 'appointment_at', 'created_at',
  'state_name', 'district_name', 'city_name', 'local_body_type', 'pincode', 'latitude', 'longitude',
  'waste_kg_per_day', 'floor_area_sqm'
];

function cell(v) {
  if (v == null) return '';
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(request) {
  const admin = getAdmin(request);
  if (!admin) return new Response('Unauthorized', { status: 401 });

  try {
    const db = getDb(request);
    const { searchParams } = new URL(request.url);
    const state = searchParams.get('state');

    let query = `
      SELECT 
        o.org_name, o.auth_person, o.email, o.phone, o.category, o.sub_category, o.plan,
        o.status, o.retainer_paid, o.payment_verified, o.balance_amount_paise, o.ack_number,
        o.assigned_admin, o.appointment_at, o.created_at,
        a.state_name, a.district_name, a.city_name, a.local_body_type, a.pincode, a.latitude, a.longitude,
        m.waste_kg_per_day, m.floor_area_sqm
      FROM organizations o
      LEFT JOIN lgd_addresses a ON o.id = a.org_id
      LEFT JOIN metrics m ON o.id = m.org_id
    `;
    let args = [];

    if (state && state !== 'All') {
      query += ` WHERE a.state_name = ? `;
      args.push(state);
    }

    query += ` ORDER BY o.created_at DESC`;

    const rows = await db.all(query, args);
    const csv = [EXPORT_COLS.join(','), ...rows.map(r => EXPORT_COLS.map(c => cell(r[c])).join(','))].join('\n');
    const stamp = new Date().toISOString().slice(0, 10);
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="submissions-${stamp}.csv"`,
      },
    });
  } catch (err) {
    console.error('[/api/admin/export]', err);
    return new Response('Export failed', { status: 500 });
  }
}
