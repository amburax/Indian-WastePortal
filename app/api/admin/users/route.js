import { NextResponse } from 'next/server';
import { getDb }        from '../../../../lib/d1-db';
import { getAdmin, hashPassword } from '../../../../lib/admin-auth';
import { writeAudit }   from '../../../../lib/audit';
import { randomUUID }   from 'crypto';

async function actingRole(db, email) {
  const row = await db.get('SELECT role FROM admin_users WHERE email = ?', [email]);
  return row?.role || 'admin';
}

/** GET — list admins (any admin). */
export async function GET(request) {
  const admin = getAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const db = getDb(request);
    const rows = await db.all('SELECT id, email, role, created_at FROM admin_users ORDER BY created_at ASC', []);
    return NextResponse.json({ me: admin.email, myRole: await actingRole(db, admin.email), users: rows });
  } catch (err) {
    console.error('[/api/admin/users GET]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/** POST — create an admin (superadmin only). Body: { email, password, role } */
export async function POST(request) {
  const admin = getAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const db = getDb(request);
    if (await actingRole(db, admin.email) !== 'superadmin')
      return NextResponse.json({ error: 'Superadmin role required' }, { status: 403 });

    const { email, password, role = 'admin' } = await request.json();
    if (!email || !password) return NextResponse.json({ error: 'email and password required' }, { status: 400 });
    if (String(password).length < 8) return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    if (!['admin', 'superadmin'].includes(role)) return NextResponse.json({ error: 'Invalid role' }, { status: 400 });

    const clean = email.toLowerCase().trim();
    const exists = await db.get('SELECT id FROM admin_users WHERE email = ?', [clean]);
    if (exists) return NextResponse.json({ error: 'Email already exists' }, { status: 409 });

    await db.run('INSERT INTO admin_users (id, email, password_hash, role) VALUES (?,?,?,?)',
      [randomUUID(), clean, hashPassword(password), role]);
    await writeAudit(db, { adminEmail: admin.email, action: 'admin_created', meta: { email: clean, role } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[/api/admin/users POST]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/** DELETE ?email= — remove an admin (superadmin only; not self, not last superadmin). */
export async function DELETE(request) {
  const admin = getAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const db = getDb(request);
    if (await actingRole(db, admin.email) !== 'superadmin')
      return NextResponse.json({ error: 'Superadmin role required' }, { status: 403 });

    const email = (new URL(request.url).searchParams.get('email') || '').toLowerCase().trim();
    if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 });
    if (email === admin.email.toLowerCase()) return NextResponse.json({ error: 'You cannot remove yourself' }, { status: 400 });

    const target = await db.get('SELECT role FROM admin_users WHERE email = ?', [email]);
    if (!target) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (target.role === 'superadmin') {
      const supers = await db.get("SELECT COUNT(*) c FROM admin_users WHERE role = 'superadmin'", []);
      if ((supers?.c || 0) <= 1) return NextResponse.json({ error: 'Cannot remove the last superadmin' }, { status: 400 });
    }

    await db.run('DELETE FROM admin_users WHERE email = ?', [email]);
    await writeAudit(db, { adminEmail: admin.email, action: 'admin_removed', meta: { email } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[/api/admin/users DELETE]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
