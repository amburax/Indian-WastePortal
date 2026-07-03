import { NextResponse } from 'next/server';
import { getDb }    from '../../../../lib/d1-db';
import { getAdmin } from '../../../../lib/admin-auth';
import { writeAudit } from '../../../../lib/audit';
import { randomUUID } from 'crypto';

const toPaise = (v) => Math.round(Number(v) * 100);

/** GET — list all pricing rules (newest last). */
export async function GET(request) {
  const admin = getAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const db = getDb(request);
    const rules = await db.all('SELECT id, est_type, location, amount_paise, active, created_at FROM pricing_rules ORDER BY est_type, location', []);
    return NextResponse.json({ rules });
  } catch (err) {
    console.error('[/api/admin/pricing GET]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/** POST — create a rule. Body: { est_type, location, amountRupees } */
export async function POST(request) {
  const admin = getAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { est_type, location = 'Any', amountRupees } = await request.json();
    if (!est_type?.trim()) return NextResponse.json({ error: 'Establishment type required' }, { status: 400 });
    const paise = toPaise(amountRupees);
    if (!paise || paise < 100) return NextResponse.json({ error: 'Valid amount (₹) required' }, { status: 400 });

    const db = getDb(request);
    const id = randomUUID();
    await db.run('INSERT INTO pricing_rules (id, est_type, location, amount_paise) VALUES (?,?,?,?)',
      [id, est_type.trim(), (location || 'Any').trim(), paise]);
    await writeAudit(db, { adminEmail: admin.email, action: 'pricing_create', meta: { est_type, location, paise } });
    return NextResponse.json({ ok: true, id });
  } catch (err) {
    console.error('[/api/admin/pricing POST]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/** PUT — update a rule. Body: { id, est_type?, location?, amountRupees?, active? } */
export async function PUT(request) {
  const admin = getAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { id, est_type, location, amountRupees, active } = await request.json();
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const set = [], params = [];
    if (est_type != null)    { set.push('est_type = ?'); params.push(String(est_type).trim()); }
    if (location != null)    { set.push('location = ?'); params.push(String(location).trim() || 'Any'); }
    if (amountRupees != null){ const p = toPaise(amountRupees); if (!p || p < 100) return NextResponse.json({ error: 'Valid amount required' }, { status: 400 }); set.push('amount_paise = ?'); params.push(p); }
    if (active != null)      { set.push('active = ?'); params.push(active ? 1 : 0); }
    if (!set.length) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });

    const db = getDb(request);
    await db.run(`UPDATE pricing_rules SET ${set.join(', ')} WHERE id = ?`, [...params, id]);
    await writeAudit(db, { adminEmail: admin.email, action: 'pricing_update', meta: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[/api/admin/pricing PUT]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/** DELETE ?id= — remove a rule. */
export async function DELETE(request) {
  const admin = getAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    const db = getDb(request);
    await db.run('DELETE FROM pricing_rules WHERE id = ?', [id]);
    await writeAudit(db, { adminEmail: admin.email, action: 'pricing_delete', meta: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[/api/admin/pricing DELETE]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
