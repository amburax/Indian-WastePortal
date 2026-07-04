import { getDb } from '../../../lib/d1-db';
import { NextResponse } from 'next/server';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type');
  const state = searchParams.get('state');
  const district = searchParams.get('district');
  const subdistrict = searchParams.get('subdistrict');

  try {
    const db = getDb(req);

    if (type === 'states') {
      const rows = await db.all('SELECT DISTINCT statename FROM pincode_directory ORDER BY statename ASC');
      return NextResponse.json(rows.map(r => r.statename));
    }
    
    if (type === 'districts') {
      if (!state) return NextResponse.json({ error: 'state is required' }, { status: 400 });
      const rows = await db.all('SELECT DISTINCT district FROM pincode_directory WHERE statename = ? ORDER BY district ASC', [state]);
      return NextResponse.json(rows.map(r => r.district));
    }
    
    if (type === 'subdistricts') {
      if (!state || !district) return NextResponse.json({ error: 'state and district required' }, { status: 400 });
      const rows = await db.all('SELECT DISTINCT divisionname FROM pincode_directory WHERE statename = ? AND district = ? ORDER BY divisionname ASC', [state, district]);
      return NextResponse.json(rows.map(r => r.divisionname));
    }
    
    if (type === 'villages') {
      if (!state || !district || !subdistrict) return NextResponse.json({ error: 'state, district, subdistrict required' }, { status: 400 });
      const rows = await db.all('SELECT officename as name, MAX(pincode) as pincode FROM pincode_directory WHERE statename = ? AND district = ? AND divisionname = ? GROUP BY officename ORDER BY officename ASC', [state, district, subdistrict]);
      return NextResponse.json(rows);
    }

    
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (error) {
    console.error('API Error /api/lgd:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
