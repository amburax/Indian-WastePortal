import { NextResponse } from 'next/server';
import { getDb, Q }     from '../../../lib/d1-db';
import { randomUUID }   from 'crypto';

/**
 * POST /api/address
 * Saves the full V2 LGD address including taluka, local_body_type, lat, lng, zone_ward.
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      org_id,
      state_code, state_name,
      district_name, sub_district,
      city_name, full_address, zone_ward,
      local_body_type, pincode,
      latitude, longitude,
    } = body;

    if (!org_id) return NextResponse.json({ error: 'org_id is required' }, { status: 400 });
    if (!state_code || !district_name || !city_name)
      return NextResponse.json({ error: 'state, district, and city are required' }, { status: 400 });

    const db  = getDb(request);
    const org = await db.get(...Q.getOrgById(org_id));
    if (!org) return NextResponse.json({ error: 'Organisation not found' }, { status: 404 });

    // Reuse existing address row ID so INSERT OR REPLACE correctly replaces instead of duplicating
    const existing = await db.get(...Q.getAddressByOrg(org_id));
    await db.run(...Q.insertAddress({
      id:              existing?.id || randomUUID(),
      org_id,
      state_code:      state_code,
      state_name:      state_name || '',
      district_name,
      sub_district:    sub_district || null,
      city_name,
      full_address:    full_address || `${city_name}, ${district_name}, ${state_name || state_code}`,
      zone_ward:       zone_ward || null,
      local_body_type: local_body_type || null,
      pincode:         pincode || null,
      latitude:        latitude  ? parseFloat(latitude)  : null,
      longitude:       longitude ? parseFloat(longitude) : null,
    }));

    return NextResponse.json({ message: 'Address saved' });

  } catch (err) {
    console.error('[/api/address]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
