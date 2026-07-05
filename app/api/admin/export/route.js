import ExcelJS      from 'exceljs';
import { getDb }    from '../../../../lib/d1-db';
import { getAdmin } from '../../../../lib/admin-auth';

/**
 * GET /api/admin/export?state= — download all submissions as a formatted .xlsx.
 *
 * Full detail: organisation + LGD address + BWG metrics + latest payment, with
 * proper Excel types (₹ currency, real dates, Yes/No), a styled frozen header
 * row, column widths and an auto-filter. Archived submissions are excluded.
 */

// Column spec — order, header, source key, width, and cell type.
const COLS = [
  // ── Organisation ──
  { h: 'Org Name',            k: 'org_name',             w: 28 },
  { h: 'Authorised Person',   k: 'auth_person',          w: 22 },
  { h: 'Email',               k: 'email',                w: 26 },
  { h: 'Phone',               k: 'phone',                w: 14 },
  { h: 'Service',             k: 'service_type',         w: 13, t: 'service' },
  { h: 'Category',            k: 'category',             w: 16 },
  { h: 'Sub-category',        k: 'sub_category',         w: 20 },
  { h: 'Plan',                k: 'plan',                 w: 12 },
  { h: 'Status',              k: 'status',               w: 16 },
  { h: 'Portal Status',       k: 'portal_status',        w: 20 },
  { h: 'ACK Number',          k: 'ack_number',           w: 22 },
  { h: 'Assigned Admin',      k: 'assigned_admin',       w: 18 },
  { h: 'Retainer Paid',       k: 'retainer_paid',        w: 13, t: 'bool' },
  { h: 'Payment Verified',    k: 'payment_verified',     w: 15, t: 'bool' },
  { h: 'Balance Invoice',     k: 'balance_amount_paise', w: 14, t: 'money' },
  { h: 'Appointment',         k: 'appointment_at',       w: 20, t: 'date' },
  { h: 'Submitted',           k: 'created_at',           w: 20, t: 'date' },
  { h: 'Completed',           k: 'completed_at',         w: 20, t: 'date' },
  { h: 'Queue #',             k: 'queue_position',       w: 9,  t: 'num' },
  { h: 'Consultant Notes',    k: 'consultant_notes',     w: 34 },
  // ── Location ──
  { h: 'State',               k: 'state_name',           w: 16 },
  { h: 'District',            k: 'district_name',        w: 16 },
  { h: 'Sub-district',        k: 'sub_district',         w: 16 },
  { h: 'City / Village',      k: 'city_name',            w: 18 },
  { h: 'Body Type',           k: 'local_body_type',      w: 12 },
  { h: 'Zone / Ward',         k: 'zone_ward',            w: 14 },
  { h: 'Pincode',             k: 'pincode',              w: 10 },
  { h: 'Full Address',        k: 'full_address',         w: 36 },
  { h: 'Latitude',            k: 'latitude',             w: 12, t: 'num' },
  { h: 'Longitude',           k: 'longitude',            w: 12, t: 'num' },
  // ── BWG metrics ──
  { h: 'Floor Area (sq.m)',   k: 'floor_area_sqm',       w: 15, t: 'num' },
  { h: 'Waste (kg/day)',      k: 'waste_kg_per_day',     w: 14, t: 'num' },
  { h: 'Water (L/day)',       k: 'water_liters_per_day', w: 14, t: 'num' },
  { h: 'Bulk Waste Generator',k: 'is_bulk_waste_generator', w: 17, t: 'bool' },
  // ── Latest payment ──
  { h: 'Payment Status',      k: 'pay_status',           w: 14 },
  { h: 'Amount Paid',         k: 'pay_amount_paise',     w: 14, t: 'money' },
  { h: 'Payment Type',        k: 'pay_kind',             w: 12 },
  { h: 'Razorpay Payment ID', k: 'razorpay_payment_id',  w: 22 },
  { h: 'Paid At',             k: 'paid_at',              w: 20, t: 'date' },
];

const parseDate = (s) => {
  if (!s) return null;
  const d = new Date(s.includes('T') || s.includes('Z') ? s : String(s).replace(' ', 'T') + 'Z');
  return isNaN(d) ? null : d;
};
const svcLabel = (s) => ({ solid_waste: 'Solid Waste', ewaste: 'E-Waste' }[s] || s || '');

function convert(col, row) {
  const v = row[col.k];
  switch (col.t) {
    case 'bool':    return v ? 'Yes' : 'No';
    case 'money':   return v == null ? null : Number(v) / 100;
    case 'date':    return parseDate(v);
    case 'num':     return v == null || v === '' ? null : Number(v);
    case 'service': return svcLabel(v);
    default:        return v == null ? '' : String(v);
  }
}

export async function GET(request) {
  const admin = getAdmin(request);
  if (!admin) return new Response('Unauthorized', { status: 401 });

  try {
    const db = getDb(request);
    const { searchParams } = new URL(request.url);
    const state = searchParams.get('state');
    const idsParam = (searchParams.get('ids') || '').split(',').map(s => s.trim()).filter(Boolean);

    const where = [];
    const args = [];
    if (idsParam.length) {
      // Export only the selected rows (bulk export) — include archived if selected.
      where.push(`o.id IN (${idsParam.map(() => '?').join(',')})`);
      args.push(...idsParam);
    } else {
      where.push('o.archived = 0');
      if (state && state !== 'All') { where.push('a.state_name = ?'); args.push(state); }
    }

    const rows = await db.all(`
      SELECT
        o.org_name, o.auth_person, o.email, o.phone, o.service_type, o.category, o.sub_category, o.plan,
        o.status, o.portal_status, o.ack_number, o.assigned_admin, o.retainer_paid, o.payment_verified,
        o.balance_amount_paise, o.appointment_at, o.created_at, o.completed_at, o.queue_position, o.consultant_notes,
        a.state_name, a.district_name, a.sub_district, a.city_name, a.local_body_type, a.zone_ward, a.pincode,
        a.full_address, a.latitude, a.longitude,
        m.floor_area_sqm, m.waste_kg_per_day, m.water_liters_per_day, m.is_bulk_waste_generator,
        p.status AS pay_status, p.amount_paise AS pay_amount_paise, p.kind AS pay_kind,
        p.razorpay_payment_id, p.paid_at
      FROM organizations o
      LEFT JOIN lgd_addresses a ON a.org_id = o.id
      LEFT JOIN metrics m       ON m.org_id = o.id
      LEFT JOIN payments p      ON p.id = (SELECT id FROM payments WHERE org_id = o.id ORDER BY created_at DESC LIMIT 1)
      WHERE ${where.join(' AND ')}
      ORDER BY o.created_at DESC
    `, args);

    // ── Build the workbook ──
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Indian Waste Portal';
    wb.created = new Date();
    const ws = wb.addWorksheet('Submissions', {
      views: [{ state: 'frozen', ySplit: 1 }],   // freeze the header row
    });

    ws.columns = COLS.map(c => ({ header: c.h, key: c.k, width: c.w }));

    // Styled header row
    const hr = ws.getRow(1);
    hr.height = 24;
    hr.eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF16654A' } };
      cell.alignment = { vertical: 'middle', horizontal: 'left' };
      cell.border = { bottom: { style: 'thin', color: { argb: 'FF0E3B2E' } } };
    });

    // Data rows
    for (const r of rows) {
      const obj = {};
      for (const c of COLS) obj[c.k] = convert(c, r);
      ws.addRow(obj);
    }

    // Per-column number/date formats
    COLS.forEach((c, i) => {
      const col = ws.getColumn(i + 1);
      if (c.t === 'money') col.numFmt = '"₹"#,##0.00';
      else if (c.t === 'date') col.numFmt = 'dd-mmm-yyyy hh:mm';
      else if (c.t === 'num') col.numFmt = '#,##0.####';
    });

    // Auto-filter across the header, and a little vertical alignment
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: COLS.length } };
    ws.eachRow((row, n) => { if (n > 1) row.alignment = { vertical: 'top', wrapText: false }; });

    const buf = await wb.xlsx.writeBuffer();
    const stamp = new Date().toISOString().slice(0, 10);
    return new Response(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="submissions-${stamp}.xlsx"`,
        'Content-Length': String(buf.byteLength),
      },
    });
  } catch (err) {
    console.error('[/api/admin/export]', err);
    return new Response('Export failed', { status: 500 });
  }
}
