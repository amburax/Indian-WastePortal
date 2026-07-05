import PDFDocument from 'pdfkit';
import { getDb } from '../../../../../lib/d1-db';

/**
 * GET /api/certificate/:token/pdf — the filing acknowledgement as a real PDF.
 * Mirrors the on-screen certificate; only available once the filing is completed
 * (status Completed or an ACK number is present).
 */
const GREEN = '#065f46';
const GREEN_SOFT = '#ecfdf5';
const GREY = '#6b7280';
const DARK = '#111827';

export async function GET(request, { params }) {
  const { token } = params;
  if (!token) return new Response('Not found', { status: 404 });

  try {
    const db = getDb(request);
    const org = await db.get('SELECT * FROM organizations WHERE payment_token = ?', [token]);
    if (!org || (org.status !== 'Completed' && !org.ack_number)) {
      return new Response('Certificate not available', { status: 404 });
    }
    const metrics = await db.get('SELECT * FROM metrics WHERE org_id = ?', [org.id]);
    const address = await db.get('SELECT * FROM lgd_addresses WHERE org_id = ?', [org.id]);

    const doc = new PDFDocument({ size: 'A4', margin: 0 });
    const chunks = [];
    doc.on('data', c => chunks.push(c));
    const done = new Promise(res => doc.on('end', res));

    const W = doc.page.width;         // 595.28
    const M = 56;                     // content margin
    const CW = W - M * 2;

    // ── Header band ──
    doc.rect(0, 0, W, 150).fill(GREEN);
    doc.fillColor('#a7f3d0').fontSize(9).font('Helvetica-Bold')
      .text('INDIAN WASTE PORTAL  ·  CPCB SWM 2026 FILING RECORD', 0, 42, { align: 'center', characterSpacing: 1.5 });
    doc.fillColor('#ffffff').fontSize(28).font('Helvetica-Bold')
      .text('FILING ACKNOWLEDGEMENT', 0, 68, { align: 'center', characterSpacing: 2 });
    doc.fillColor('#6ee7b7').fontSize(9).font('Helvetica')
      .text('This confirms Indian Waste Portal filed the CPCB SWM registration for', 0, 110, { align: 'center' });

    let y = 178;
    // ── Org name ──
    doc.fillColor(DARK).fontSize(22).font('Helvetica-Bold').text(org.org_name || '—', M, y, { width: CW, align: 'center' });
    y = doc.y + 4;
    doc.fillColor(GREY).fontSize(11).font('Helvetica')
      .text(`Represented by ${org.auth_person || '—'}`, M, y, { width: CW, align: 'center' });
    y = doc.y + 24;

    // ── ACK + Category box ──
    doc.roundedRect(M, y, CW, 74, 10).fill(GREEN_SOFT);
    doc.fillColor(GREEN).fontSize(8).font('Helvetica-Bold').text('CPCB ACKNOWLEDGEMENT NUMBER', M, y + 16, { width: CW / 2, align: 'center', characterSpacing: 1 });
    doc.fillColor(DARK).fontSize(15).font('Courier-Bold').text(org.ack_number || '—', M, y + 34, { width: CW / 2, align: 'center' });
    doc.fillColor(GREEN).fontSize(8).font('Helvetica-Bold').text('SERVICE CATEGORY', M + CW / 2, y + 16, { width: CW / 2, align: 'center', characterSpacing: 1 });
    doc.fillColor(DARK).fontSize(14).font('Helvetica-Bold').text(org.category || '—', M + CW / 2, y + 33, { width: CW / 2, align: 'center' });
    // divider
    doc.moveTo(M + CW / 2, y + 14).lineTo(M + CW / 2, y + 60).lineWidth(0.7).strokeColor('#a7f3d0').stroke();
    y += 74 + 34;

    // ── Two columns: address + facility ──
    const colW = (CW - 30) / 2;
    const label = (txt, x, yy) => doc.fillColor(GREY).fontSize(8).font('Helvetica-Bold').text(txt, x, yy, { width: colW, characterSpacing: 1 });
    label('REGISTERED ADDRESS', M, y);
    doc.moveTo(M, y + 14).lineTo(M + colW, y + 14).lineWidth(0.7).strokeColor('#e5e7eb').stroke();
    const addrLines = [
      address?.full_address,
      [address?.city_name, address?.district_name].filter(Boolean).join(', '),
      [address?.state_name, address?.pincode].filter(Boolean).join(' - '),
    ].filter(Boolean).join('\n');
    doc.fillColor(DARK).fontSize(11).font('Helvetica').text(addrLines || '—', M, y + 24, { width: colW, lineGap: 3 });

    const x2 = M + colW + 30;
    label('FACILITY DETAILS', x2, y);
    doc.moveTo(x2, y + 14).lineTo(x2 + colW, y + 14).lineWidth(0.7).strokeColor('#e5e7eb').stroke();
    const facRow = (k, v, yy) => {
      doc.fillColor(GREY).fontSize(10).font('Helvetica').text(k, x2, yy, { width: colW / 2 });
      doc.fillColor(DARK).fontSize(10).font('Helvetica-Bold').text(v, x2 + colW / 2, yy, { width: colW / 2, align: 'right' });
    };
    facRow('Floor Area', `${metrics?.floor_area_sqm ?? '—'} sq.m`, y + 24);
    facRow('Waste Generation', `${metrics?.waste_kg_per_day ?? '—'} kg/day`, y + 44);
    facRow('Water Usage', `${metrics?.water_liters_per_day ?? '—'} L/day`, y + 64);
    facRow('Bulk Generator', metrics?.is_bulk_waste_generator ? 'Yes' : 'No', y + 84);
    y += 130;

    // ── Status footer ──
    doc.moveTo(M, y).lineTo(M + CW, y).lineWidth(0.7).strokeColor('#e5e7eb').stroke();
    y += 24;
    doc.fillColor(DARK).fontSize(14).font('Helvetica-Bold').text('Filing Submitted to CPCB', M, y, { width: CW, align: 'center' });
    doc.fillColor(GREEN).fontSize(9).font('Helvetica-Bold').text((org.portal_status || 'Pending Verification at ULB').toUpperCase(), M, doc.y + 4, { width: CW, align: 'center', characterSpacing: 1 });

    doc.fillColor('#9ca3af').fontSize(8).font('Helvetica').text(
      `This is a filing record issued by Indian Waste Portal — an independent consultant, not a government body and not affiliated with CPCB. ` +
      `The official acknowledgement is CPCB No. ${org.ack_number || '—'}, verifiable at swm.cpcb.gov.in. ` +
      `Generated on ${new Date().toLocaleDateString('en-IN')}.`,
      M, doc.y + 26, { width: CW, align: 'center', lineGap: 2 }
    );

    doc.end();
    await done;
    const buf = Buffer.concat(chunks);
    const safe = (org.org_name || 'certificate').replace(/[^a-z0-9]+/gi, '-').toLowerCase().slice(0, 40);
    return new Response(buf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="filing-acknowledgement-${safe}.pdf"`,
        'Content-Length': String(buf.byteLength),
      },
    });
  } catch (err) {
    console.error('[/api/certificate/pdf]', err);
    return new Response('Failed to generate PDF', { status: 500 });
  }
}
