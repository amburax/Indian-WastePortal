import { NextResponse } from 'next/server';
import { getDb, Q }     from '../../../lib/d1-db';
import { randomUUID }   from 'crypto';

/**
 * POST /api/metrics
 * Saves BWG threshold metrics for an org.
 * Server-side re-verifies BWG eligibility to prevent client-side bypass.
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      org_id,
      floor_area_sqm        = 0,
      waste_kg_per_day      = 0,
      water_liters_per_day  = 0,
      qualifying_criteria   = '[]',
    } = body;

    if (!org_id) return NextResponse.json({ error: 'org_id is required' }, { status: 400 });

    const db  = getDb(request);
    const org = await db.get(...Q.getOrgById(org_id));
    if (!org) return NextResponse.json({ error: 'Organisation not found' }, { status: 404 });

    // ── Server-side BWG verification (can't be spoofed) ────
    const area  = parseFloat(floor_area_sqm)       || 0;
    const waste = parseFloat(waste_kg_per_day)      || 0;
    const water = parseFloat(water_liters_per_day)  || 0;

    const isBWG = area >= 20000 || waste >= 100 || water >= 40000;

    // Reuse existing row ID to make the ON CONFLICT(id) trigger correctly
    const existing  = await db.get(...Q.getMetricsByOrg(org_id));
    const metricsId = existing?.id || randomUUID();
    await db.run(...Q.upsertMetrics({
      id:                    metricsId,
      org_id,
      floor_area_sqm:        area,
      waste_kg_per_day:      waste,
      water_liters_per_day:  water,
      is_bulk_waste_generator: isBWG ? 1 : 0,
      qualifying_criteria: typeof qualifying_criteria === 'string'
        ? qualifying_criteria
        : JSON.stringify(qualifying_criteria),
    }));

    return NextResponse.json({ metricsId, is_bulk_waste_generator: isBWG, message: 'Metrics saved' });

  } catch (err) {
    console.error('[/api/metrics]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
