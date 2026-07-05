import { NextResponse } from 'next/server';
import { getDb }     from '../../../../../lib/d1-db';
import { getAdmin }  from '../../../../../lib/admin-auth';
import { writeAudit } from '../../../../../lib/audit';

/**
 * POST /api/admin/action/archive
 * Soft delete: archive (hide from the default list) or restore a submission.
 * Body: { orgId, archive: true|false }
 *
 * Uses the `archived` flag so the real status is preserved — nothing is
 * destroyed and it can be restored at any time.
 */
export async function POST(request) {
  const admin = getAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const archive = body.archive !== false;                 // default true
    // Accept a single orgId or a bulk orgIds array.
    const ids = Array.isArray(body.orgIds) ? body.orgIds.filter(Boolean) : (body.orgId ? [body.orgId] : []);
    if (!ids.length) return NextResponse.json({ error: 'orgId or orgIds required' }, { status: 400 });

    const db   = getDb(request);
    const flag = archive ? 1 : 0;
    let count = 0;
    for (const id of ids) {
      const res = await db.run('UPDATE organizations SET archived = ? WHERE id = ?', [flag, id]);
      if (res?.changes) {
        count++;
        await writeAudit(db, { adminEmail: admin.email, orgId: id, action: archive ? 'archive' : 'restore' });
      }
    }
    return NextResponse.json({ ok: true, archived: !!flag, count });
  } catch (err) {
    console.error('[admin/action/archive]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
