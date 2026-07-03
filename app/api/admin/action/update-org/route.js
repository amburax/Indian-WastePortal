import { NextResponse } from 'next/server';
import { getDb, Q }     from '../../../../../lib/d1-db';
import { getAdmin }     from '../../../../../lib/admin-auth';
import { writeAudit }   from '../../../../../lib/audit';

/**
 * POST /api/admin/action/update-org — edit core org fields.
 * Body: { orgId, fields: { org_name, auth_person, email, phone, category, sub_category, plan } }
 */
const EDITABLE = ['org_name', 'auth_person', 'email', 'phone', 'category', 'sub_category', 'plan'];

export async function POST(request) {
  const admin = getAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { orgId, fields } = await request.json();
    if (!orgId || !fields || typeof fields !== 'object')
      return NextResponse.json({ error: 'orgId and fields required' }, { status: 400 });

    const db  = getDb(request);
    const org = await db.get(...Q.getOrgById(orgId));
    if (!org) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const set = [], params = [], changed = {};
    for (const key of EDITABLE) {
      if (!(key in fields)) continue;
      let v = fields[key];
      if (typeof v === 'string') v = v.trim();
      if (key === 'email' && v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))
        return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
      if (key === 'phone' && v && !/^\d{10}$/.test(String(v).replace(/\s/g, '')))
        return NextResponse.json({ error: 'Phone must be 10 digits' }, { status: 400 });
      if (key === 'email') v = v.toLowerCase();
      if (key === 'phone') v = String(v).replace(/\s/g, '');
      set.push(`${key} = ?`); params.push(v || null); changed[key] = v;
    }
    if (!set.length) return NextResponse.json({ error: 'No editable fields provided' }, { status: 400 });

    try {
      await db.run(`UPDATE organizations SET ${set.join(', ')} WHERE id = ?`, [...params, orgId]);
    } catch (e) {
      if (/UNIQUE|constraint/i.test(e.message))
        return NextResponse.json({ error: 'That email or phone is already used by another org' }, { status: 409 });
      throw e;
    }

    await writeAudit(db, { adminEmail: admin.email, orgId, action: 'update_org', meta: { fields: Object.keys(changed) } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[admin/action/update-org]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
