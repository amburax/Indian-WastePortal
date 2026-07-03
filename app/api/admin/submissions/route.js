import { NextResponse } from 'next/server';
import { getDb }    from '../../../../lib/d1-db';
import { getAdmin } from '../../../../lib/admin-auth';

/**
 * GET /api/admin/submissions?limit&offset&q&status
 * Server-side paginated + searchable submissions list.
 */
export async function GET(request) {
  const admin = getAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const limit  = Math.min(parseInt(searchParams.get('limit')  || '25', 10), 200);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0);
    const q      = (searchParams.get('q') || '').trim();
    const status = searchParams.get('status') || '';

    const where = [];
    const params = [];
    if (status && status !== 'All') { where.push('o.status = ?'); params.push(status); }
    if (q) {
      where.push('(o.org_name LIKE ? OR o.email LIKE ? OR o.phone LIKE ? OR o.auth_person LIKE ? OR o.ack_number LIKE ?)');
      const like = `%${q}%`;
      params.push(like, like, like, like, like);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const db = getDb(request);
    const totalRow = await db.get(`SELECT COUNT(*) c FROM organizations o ${whereSql}`, params);
    const rows = await db.all(`
      SELECT
        o.id, o.org_name, o.auth_person, o.email, o.phone, o.category, o.sub_category,
        o.plan, o.status, o.payment_verified, o.retainer_paid, o.appointment_at, o.assigned_admin,
        o.ack_number, o.created_at,
        (SELECT qj.status       FROM queue_jobs qj WHERE qj.org_id = o.id ORDER BY qj.created_at DESC LIMIT 1) AS job_status,
        (SELECT qj.otp_attempts FROM queue_jobs qj WHERE qj.org_id = o.id ORDER BY qj.created_at DESC LIMIT 1) AS otp_attempts
      FROM organizations o
      ${whereSql}
      ORDER BY o.created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, limit, offset]);

    return NextResponse.json({
      admin: admin.email,
      total: totalRow?.c || 0,
      limit, offset,
      submissions: rows,
    });
  } catch (err) {
    console.error('[/api/admin/submissions]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
