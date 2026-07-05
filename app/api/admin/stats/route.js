import { NextResponse } from 'next/server';
import { getDb }    from '../../../../lib/d1-db';
import { getAdmin, getAdminRole } from '../../../../lib/admin-auth';

/**
 * GET /api/admin/stats — dashboard KPIs: status counts, funnel, revenue, notifications.
 */
export async function GET(request) {
  const admin = getAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const db = getDb(request);

    // Archived submissions are excluded from every KPI (they're hidden from the list too).
    const statusRows = await db.all('SELECT status, COUNT(*) c FROM organizations WHERE archived = 0 GROUP BY status', []);
    const counts = {};
    let total = 0;
    for (const r of statusRows) { counts[r.status] = r.c; total += r.c; }

    const funnelRow = await db.get(`
      SELECT
        SUM(CASE WHEN retainer_paid = 1 THEN 1 ELSE 0 END)    AS retainer_paid,
        SUM(CASE WHEN payment_verified = 1 THEN 1 ELSE 0 END) AS balance_paid
      FROM organizations WHERE archived = 0`, []);

    const revRows = await db.all("SELECT kind, SUM(amount_paise) paise, COUNT(*) n FROM payments WHERE status = 'paid' AND org_id IN (SELECT id FROM organizations WHERE archived = 0) GROUP BY kind", []);
    const revenue = { retainer: 0, balance: 0, full: 0, total: 0 };
    for (const r of revRows) { revenue[r.kind || 'full'] = r.paise || 0; revenue.total += r.paise || 0; }

    const notifRows = await db.all('SELECT status, COUNT(*) c FROM notifications GROUP BY status', []);
    const notifications = { queued: 0, sent: 0, failed: 0, total: 0 };
    for (const r of notifRows) { notifications[r.status] = r.c; notifications.total += r.c; }

    const upcoming = await db.get(
      "SELECT COUNT(*) c FROM organizations WHERE archived = 0 AND appointment_at IS NOT NULL AND appointment_at >= datetime('now')", []);

    return NextResponse.json({
      admin: admin.email,
      role: await getAdminRole(db, admin.email),
      total,
      counts,
      funnel: {
        total,
        retainer_paid: funnelRow?.retainer_paid || 0,
        balance_paid:  funnelRow?.balance_paid  || 0,
        completed:     counts.Completed || 0,
        needs_attention: counts.NeedsAttention || 0,
      },
      revenue,
      notifications,
      upcoming_appointments: upcoming?.c || 0,
    });
  } catch (err) {
    console.error('[/api/admin/stats]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
