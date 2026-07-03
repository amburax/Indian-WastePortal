import { NextResponse } from 'next/server';
import { getDb, Q }     from '../../../../../lib/d1-db';
import { getAdmin }     from '../../../../../lib/admin-auth';
import { writeAudit }   from '../../../../../lib/audit';

/**
 * POST /api/admin/action/add-note — append a timestamped note to consultant_notes.
 * Body: { orgId, note }
 */
export async function POST(request) {
  const admin = getAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { orgId, note } = await request.json();
    if (!orgId || !note?.trim()) return NextResponse.json({ error: 'orgId and note required' }, { status: 400 });

    const db  = getDb(request);
    const org = await db.get(...Q.getOrgById(orgId));
    if (!org) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const entry = `[${stamp} · ${admin.email}] ${note.trim()}`;
    const merged = org.consultant_notes ? `${org.consultant_notes}\n${entry}` : entry;

    await db.run('UPDATE organizations SET consultant_notes = ? WHERE id = ?', [merged, orgId]);
    await writeAudit(db, { adminEmail: admin.email, orgId, action: 'add_note', meta: { note: note.trim().slice(0, 120) } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[admin/action/add-note]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
