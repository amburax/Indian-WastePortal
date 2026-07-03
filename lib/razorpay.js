/**
 * Razorpay helpers shared by order creation + balance Payment Links.
 * Degrades gracefully when keys are placeholders (local dev) so the flow stays
 * testable without live credentials.
 */
import { randomUUID } from 'crypto';

export function isRealRazorpay() {
  const id = process.env.RAZORPAY_KEY_ID || '';
  const sec = process.env.RAZORPAY_KEY_SECRET || '';
  return !!id && !!sec && !id.includes('REPLACE') && !sec.includes('REPLACE');
}

async function client() {
  const Razorpay = (await import('razorpay')).default;
  return new Razorpay({
    key_id:     process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

/** Create an order (real) or a synthetic dev order. Returns { id, amount, currency }. */
export async function createOrder({ amount, orgId, kind = 'full' }) {
  if (!isRealRazorpay()) {
    return { id: `order_dev_${randomUUID().slice(0, 12)}`, amount, currency: 'INR', _dev: true };
  }
  const rzp = await client();
  const order = await rzp.orders.create({
    amount, currency: 'INR',
    receipt: `iwp_${kind}_${String(orgId).slice(0, 8)}`,
    notes: { org_id: orgId, kind },
  });
  return { id: order.id, amount: order.amount, currency: order.currency };
}

/**
 * Create a hosted Payment Link for the balance invoice (real) or return a dev
 * fallback that routes the client back to their portal to pay the balance.
 * Returns { id, short_url, dev }.
 */
export async function createBalancePaymentLink({ amount, orgId, token, name, email, phone, description }) {
  const base = process.env.APP_BASE_URL || 'http://localhost:3000';

  if (!isRealRazorpay()) {
    return {
      id: `plink_dev_${randomUUID().slice(0, 12)}`,
      short_url: `${base}/portal?token=${token}&pay=balance`,
      dev: true,
    };
  }

  const rzp = await client();
  const link = await rzp.paymentLink.create({
    amount,
    currency: 'INR',
    accept_partial: false,
    description: description || 'CPCB SWM filing — balance invoice',
    customer: { name: name || undefined, email: email || undefined, contact: phone || undefined },
    notify: { sms: true, email: true },
    reminder_enable: true,
    notes: { org_id: orgId, kind: 'balance' },
    callback_url: `${base}/portal?token=${token}`,
    callback_method: 'get',
  });
  return { id: link.id, short_url: link.short_url, dev: false };
}
