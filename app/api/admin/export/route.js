import { getDb }    from '../../../../lib/d1-db';
import { getAdmin } from '../../../../lib/admin-auth';

/**
 * GET /api/admin/export — download all submissions as CSV.
 */
const COLS = [
  'org_name', 'auth_person', 'email', 'phone', 'category', 'sub_category', 'plan',
  'status', 'retainer_paid', 'payment_verified', 'balance_amount_paise', 'ack_number',
  'assigned_admin', 'appointment_at', 'created_at',
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
    const rows = await db.all(`SELECT ${COLS.join(', ')} FROM organizations ORDER BY created_at DESC`, []);
    const csv = [COLS.join(','), ...rows.map(r => COLS.map(c => cell(r[c])).join(','))].join('\n');
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
