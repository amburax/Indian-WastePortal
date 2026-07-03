import { NextResponse } from 'next/server';
import { getDb }    from '../../../../lib/d1-db';
import { getAdmin } from '../../../../lib/admin-auth';

/**
 * GET /api/admin/audit?limit&offset&action&admin
 * Returns the audit trail (newest first), joined with org name for context.
 */
export async function GET(request) {
  const admin = getAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const limit  = Math.min(parseInt(searchParams.get('limit')  || '100', 10), 500);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0);
    const action = searchParams.get('action') || null;

    const db = getDb(request);
    const where = action ? 'WHERE a.action = ?' : '';
    const params = action ? [action, limit, offset] : [limit, offset];

    const rows = await db.all(`
      SELECT a.id, a.admin_email, a.org_id, a.action, a.meta, a.created_at,
             o.org_name
      FROM audit_log a
      LEFT JOIN organizations o ON o.id = a.org_id
      ${where}
      ORDER BY a.created_at DESC, a.rowid DESC
      LIMIT ? OFFSET ?
    `, params);

    const actions = await db.all('SELECT DISTINCT action FROM audit_log ORDER BY action', []);
    return NextResponse.json({ rows, actions: actions.map(r => r.action) });
  } catch (err) {
    console.error('[/api/admin/audit]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
