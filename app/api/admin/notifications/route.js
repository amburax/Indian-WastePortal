import { NextResponse } from 'next/server';
import { getDb }    from '../../../../lib/d1-db';
import { getAdmin } from '../../../../lib/admin-auth';

/**
 * GET /api/admin/notifications?limit&offset&type — notification dispatch log.
 */
export async function GET(request) {
  const admin = getAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const limit  = Math.min(parseInt(searchParams.get('limit')  || '100', 10), 500);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0);
    const type   = searchParams.get('type') || null;

    const db = getDb(request);
    const where = type ? 'WHERE n.type = ?' : '';
    const params = type ? [type, limit, offset] : [limit, offset];

    const rows = await db.all(`
      SELECT n.id, n.org_id, n.channel, n.type, n.status, n.payload, n.created_at, o.org_name
      FROM notifications n
      LEFT JOIN organizations o ON o.id = n.org_id
      ${where}
      ORDER BY n.created_at DESC, n.rowid DESC
      LIMIT ? OFFSET ?
    `, params);

    const types = await db.all('SELECT DISTINCT type FROM notifications ORDER BY type', []);
    return NextResponse.json({ rows, types: types.map(r => r.type) });
  } catch (err) {
    console.error('[/api/admin/notifications]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
