import { getDb } from '../../../lib/d1-db';
import { NextResponse } from 'next/server';

/**
 * LGD address reference data (states → districts → sub-districts → villages),
 * served from the ~165k-row pincode_directory.
 *
 * This is immutable reference data queried on every dropdown change, so each
 * DISTINCT/GROUP BY is memoised in-process (removes the repeated full-table
 * scans) and marked publicly cacheable so the browser/CDN can hold it too.
 */
const TTL_MS = 12 * 60 * 60 * 1000;           // 12h — pincode data is effectively static
const _memo = new Map();                      // key → { data, exp }

async function cached(key, loader) {
  const hit = _memo.get(key);
  if (hit && hit.exp > Date.now()) return hit.data;
  const data = await loader();
  _memo.set(key, { data, exp: Date.now() + TTL_MS });
  return data;
}

const CACHE_HEADERS = {
  // Public reference data — safe to cache at every layer.
  'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400',
};
const ok = (data) => NextResponse.json(data, { headers: CACHE_HEADERS });

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type');
  const state = searchParams.get('state');
  const district = searchParams.get('district');
  const subdistrict = searchParams.get('subdistrict');

  try {
    const db = getDb(req);

    if (type === 'states') {
      const data = await cached('states', async () =>
        (await db.all('SELECT DISTINCT statename FROM pincode_directory ORDER BY statename ASC')).map(r => r.statename));
      return ok(data);
    }

    if (type === 'districts') {
      if (!state) return NextResponse.json({ error: 'state is required' }, { status: 400 });
      const data = await cached(`districts:${state}`, async () =>
        (await db.all('SELECT DISTINCT district FROM pincode_directory WHERE statename = ? ORDER BY district ASC', [state])).map(r => r.district));
      return ok(data);
    }

    if (type === 'subdistricts') {
      if (!state || !district) return NextResponse.json({ error: 'state and district required' }, { status: 400 });
      const data = await cached(`subdistricts:${state}:${district}`, async () =>
        (await db.all('SELECT DISTINCT divisionname FROM pincode_directory WHERE statename = ? AND district = ? ORDER BY divisionname ASC', [state, district])).map(r => r.divisionname));
      return ok(data);
    }

    if (type === 'villages') {
      if (!state || !district || !subdistrict) return NextResponse.json({ error: 'state, district, subdistrict required' }, { status: 400 });
      const data = await cached(`villages:${state}:${district}:${subdistrict}`, async () =>
        await db.all('SELECT officename as name, MAX(pincode) as pincode FROM pincode_directory WHERE statename = ? AND district = ? AND divisionname = ? GROUP BY officename ORDER BY officename ASC', [state, district, subdistrict]));
      return ok(data);
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (error) {
    console.error('API Error /api/lgd:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
