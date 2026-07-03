import { NextResponse } from 'next/server';
import { getDb }    from '../../../../../lib/d1-db';
import { getAdmin } from '../../../../../lib/admin-auth';
import { retryNotification } from '../../../../../lib/notify';
import { writeAudit } from '../../../../../lib/audit';

/**
 * POST /api/admin/notifications/retry  { id } — re-dispatch a notification.
 */
export async function POST(request) {
  const admin = getAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const db = getDb(request);
    const r = await retryNotification(db, id);
    if (!r.ok) return NextResponse.json({ error: r.error || 'Retry failed' }, { status: 404 });

    await writeAudit(db, { adminEmail: admin.email, action: 'notification_retry', meta: { id, status: r.status } });
    return NextResponse.json({ ok: true, status: r.status });
  } catch (err) {
    console.error('[/api/admin/notifications/retry]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
