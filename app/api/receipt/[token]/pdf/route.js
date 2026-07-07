import PDFDocument from 'pdfkit';
import { getDb } from '../../../../../lib/d1-db';

/**
 * GET /api/receipt/:token/pdf — payment receipt (Bill of Supply) as a PDF.
 *
 * Not a GST tax invoice — the business is not GST-registered, so this is a plain
 * payment receipt with a sequential number, clearly labelled. Available once the
 * org has a captured payment. The receipt number is lazily assigned (per Indian
 * financial year) on first download and stored, so it's stable thereafter.
 */
const GREEN = '#065f46';
const GREY = '#6b7280';
const DARK = '#111827';
const LINE = '#e5e7eb';

const BIZ = {
  name:  process.env.BUSINESS_NAME  || 'Indian Waste Portal',
  email: process.env.BUSINESS_EMAIL || 'indianwasteportal@gmail.com',
  site:  process.env.APP_BASE_URL   || 'https://indianwasteportal.com',
};
const inr = (p) => `Rs. ${((p || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

// Indian financial year label for a date, e.g. 2026-07 -> "2026-27".
function fyLabel(d = new Date()) {
  const y = d.getFullYear(), m = d.getMonth() + 1;
  const start = m >= 4 ? y : y - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, '0')}`;
}

async function assignReceiptNo(db, pay) {
  if (pay.receipt_no) return pay.receipt_no;
  const fy = fyLabel(new Date());
  // Atomic per-FY counter (same UPSERT..RETURNING pattern used elsewhere).
  const row = await db.get(
    `INSERT INTO queue_counter (key, value) VALUES (?, 1)
     ON CONFLICT(key) DO UPDATE SET value = queue_counter.value + 1
     RETURNING value`,
    [`receipt:${fy}`]
  ).catch(() => null);
  const seq = row?.value || 1;
  const no = `IWP/${fy}/${String(seq).padStart(4, '0')}`;
  // Only claim it if this payment still has none (guards the rare race).
  const res = await db.run('UPDATE payments SET receipt_no = ? WHERE id = ? AND receipt_no IS NULL', [no, pay.id]);
  if (res?.changes) return no;
  const fresh = await db.get('SELECT receipt_no FROM payments WHERE id = ?', [pay.id]);
  return fresh?.receipt_no || no;
}

export async function GET(request, { params }) {
  const { token } = params;
  if (!token) return new Response('Not found', { status: 404 });

  try {
    const db = getDb(request);
    const org = await db.get('SELECT * FROM organizations WHERE payment_token = ?', [token]);
    if (!org) return new Response('Not found', { status: 404 });

    const pay = await db.get(
      "SELECT * FROM payments WHERE org_id = ? AND status = 'paid' ORDER BY created_at DESC LIMIT 1",
      [org.id]
    );
    if (!pay) return new Response('No payment on record for this registration', { status: 404 });

    const address = await db.get('SELECT * FROM lgd_addresses WHERE org_id = ?', [org.id]);
    const receiptNo = await assignReceiptNo(db, pay);
    const paidDate = pay.paid_at ? new Date(String(pay.paid_at).includes('T') || String(pay.paid_at).includes('Z') ? pay.paid_at : String(pay.paid_at).replace(' ', 'T') + 'Z') : new Date();

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks = [];
    doc.on('data', c => chunks.push(c));
    const end = new Promise(r => doc.on('end', r));
    const M = 50, W = doc.page.width, CW = W - M * 2;

    // Header
    doc.fillColor(GREEN).fontSize(20).font('Helvetica-Bold').text(BIZ.name, M, 54);
    doc.fillColor(GREY).fontSize(9).font('Helvetica').text(`${BIZ.email}  ·  ${BIZ.site.replace(/^https?:\/\//, '')}`, M, 80);
    doc.fillColor(DARK).fontSize(16).font('Helvetica-Bold').text('PAYMENT RECEIPT', M, 54, { width: CW, align: 'right' });
    doc.fillColor(GREY).fontSize(9).font('Helvetica')
      .text(`Receipt No: ${receiptNo}`, M, 78, { width: CW, align: 'right' })
      .text(`Date: ${paidDate.toLocaleDateString('en-IN', { dateStyle: 'medium' })}`, M, 92, { width: CW, align: 'right' });

    doc.moveTo(M, 116).lineTo(M + CW, 116).lineWidth(1).strokeColor(LINE).stroke();

    // Billed to
    let y = 134;
    doc.fillColor(GREY).fontSize(8).font('Helvetica-Bold').text('RECEIVED FROM', M, y, { characterSpacing: 1 });
    doc.fillColor(DARK).fontSize(12).font('Helvetica-Bold').text(org.org_name || '—', M, y + 14);
    const who = [org.auth_person, org.email, org.phone].filter(Boolean).join('  ·  ');
    doc.fillColor(GREY).fontSize(10).font('Helvetica').text(who, M, doc.y + 2);
    if (address) {
      const addr = [address.full_address, [address.city_name, address.district_name].filter(Boolean).join(', '), [address.state_name, address.pincode].filter(Boolean).join(' - ')].filter(Boolean).join('\n');
      doc.fillColor(GREY).fontSize(10).font('Helvetica').text(addr, M, doc.y + 2, { lineGap: 2 });
    }
    y = doc.y + 24;

    // Line item table
    const rowY = y;
    doc.rect(M, rowY, CW, 26).fill('#f3f4f6');
    doc.fillColor(GREY).fontSize(9).font('Helvetica-Bold')
      .text('DESCRIPTION', M + 12, rowY + 9)
      .text('AMOUNT', M, rowY + 9, { width: CW - 12, align: 'right' });
    const desc = `CPCB SWM 2026 — Bulk Waste Generator registration${org.category ? ` (${org.category})` : ''}\nConsultancy & filing fee`;
    const itemY = rowY + 34;
    doc.fillColor(DARK).fontSize(10).font('Helvetica').text(desc, M + 12, itemY, { width: CW * 0.66, lineGap: 2 });
    doc.fillColor(DARK).fontSize(11).font('Helvetica-Bold').text(inr(pay.amount_paise), M, itemY, { width: CW - 12, align: 'right' });
    y = Math.max(doc.y, itemY + 26) + 8;

    // Total
    doc.moveTo(M + CW * 0.5, y).lineTo(M + CW, y).lineWidth(1).strokeColor(LINE).stroke();
    y += 10;
    doc.fillColor(DARK).fontSize(12).font('Helvetica-Bold').text('Total Paid', M + CW * 0.5, y, { width: CW * 0.3 });
    doc.fillColor(GREEN).fontSize(13).font('Helvetica-Bold').text(inr(pay.amount_paise), M + CW * 0.5, y, { width: CW * 0.5, align: 'right' });
    y += 22;
    if (pay.refund_id) {
      doc.fillColor('#b91c1c').fontSize(10).font('Helvetica')
        .text(`Refunded: ${inr(pay.refund_amount_paise)} (${pay.refund_status || 'processed'})`, M + CW * 0.5, y, { width: CW * 0.5, align: 'right' });
      y += 18;
    }

    // Payment reference
    y += 12;
    doc.fillColor(GREY).fontSize(9).font('Helvetica')
      .text(`Payment reference: ${pay.razorpay_payment_id || pay.razorpay_order_id || '—'}   ·   Method: Razorpay   ·   Status: Paid`, M, y, { width: CW });

    // Footer disclaimer
    doc.moveTo(M, 720).lineTo(M + CW, 720).lineWidth(1).strokeColor(LINE).stroke();
    doc.fillColor(GREY).fontSize(9).font('Helvetica-Bold')
      .text('Payment receipt — not a tax invoice.', M, 732, { width: CW, align: 'center' });
    doc.fillColor('#9ca3af').fontSize(8).font('Helvetica')
      .text(`${BIZ.name} is not registered under GST; no tax has been charged. This is a computer-generated receipt and needs no signature.`, M, 748, { width: CW, align: 'center', lineGap: 2 });

    doc.end();
    await end;
    const buf = Buffer.concat(chunks);
    return new Response(buf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="receipt-${receiptNo.replace(/\//g, '-')}.pdf"`,
        'Content-Length': String(buf.byteLength),
      },
    });
  } catch (err) {
    console.error('[/api/receipt/pdf]', err);
    return new Response('Failed to generate receipt', { status: 500 });
  }
}
