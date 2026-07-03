/**
 * Notification dispatch — provider-abstracted SMS / WhatsApp / email.
 *
 * Records every message in the `notifications` table (Phase 1 migration), then
 * dispatches via the provider selected by NOTIFY_PROVIDER.
 *
 *   NOTIFY_PROVIDER unset / 'log'  → log-only (dev default). Nothing external is
 *                                     called; the row is marked 'sent'.
 *   NOTIFY_PROVIDER = 'twilio' | 'msg91' | 'gupshup' → wire a real adapter in
 *                                     dispatchExternal() (stubbed for now).
 *
 * Design: a single dispatchExternal() seam so a real gateway drops in later
 * without touching call sites. No real messages are sent until credentials and
 * a provider are configured — safe to leave on in dev.
 */
import { randomUUID } from 'crypto';

/**
 * @param {object} db   - DB adapter from getDb(request) (or the worker's better-sqlite3)
 * @param {object} opts
 * @param {string}  opts.orgId
 * @param {string}  opts.channel  - 'sms' | 'whatsapp' | 'email'
 * @param {string}  opts.type     - 'submission_ack' | 'otp_link' | 'needs_attention'
 * @param {string}  opts.payload  - rendered message / link
 * @returns {Promise<{id:string, status:string}>}
 */
export async function sendNotification(db, { orgId, channel = 'whatsapp', type, payload }) {
  const id = randomUUID();

  // 1. Look up the recipient (best-effort; dispatch can still log without it).
  let recipient = null;
  try {
    const org = await db.get('SELECT phone, email FROM organizations WHERE id = ?', [orgId]);
    recipient = channel === 'email' ? org?.email : org?.phone;
  } catch { /* org lookup is non-fatal */ }

  // 2. Persist as 'queued'.
  try {
    await db.run(
      'INSERT INTO notifications (id, org_id, channel, type, status, payload) VALUES (?,?,?,?,?,?)',
      [id, orgId, channel, type, 'queued', payload]
    );
  } catch (e) {
    console.warn('[notify] insert failed (non-fatal):', e.message);
  }

  // 3. Dispatch.
  let status = 'sent';
  try {
    await dispatchExternal({ channel, recipient, type, payload });
  } catch (e) {
    status = 'failed';
    console.warn('[notify] dispatch failed:', e.message);
  }

  // 4. Update status.
  try {
    await db.run('UPDATE notifications SET status = ? WHERE id = ?', [status, id]);
  } catch { /* non-fatal */ }

  return { id, status };
}

/** Re-dispatch an existing notification (e.g. a failed one) and update its status in place. */
export async function retryNotification(db, id) {
  const row = await db.get('SELECT * FROM notifications WHERE id = ?', [id]);
  if (!row) return { ok: false, error: 'Notification not found' };

  let recipient = null;
  try {
    const org = await db.get('SELECT phone, email FROM organizations WHERE id = ?', [row.org_id]);
    recipient = row.channel === 'email' ? org?.email : org?.phone;
  } catch { /* non-fatal */ }

  let status = 'sent';
  try { await dispatchExternal({ channel: row.channel, recipient, type: row.type, payload: row.payload }); }
  catch (e) { status = 'failed'; console.warn('[notify:retry]', e.message); }

  await db.run('UPDATE notifications SET status = ? WHERE id = ?', [status, id]);
  return { ok: true, status };
}

/** Normalise an Indian mobile to E.164 digits (countrycode + number, no +). */
function toE164(num) {
  const d = String(num || '').replace(/[^\d]/g, '');
  return d.startsWith('91') ? d : `91${d}`;
}

/**
 * The single provider seam. Selected by NOTIFY_PROVIDER:
 *   'log' (default) → console only, no external call
 *   'msg91'         → MSG91 WhatsApp (template) / SMS (flow)
 *   'gupshup'       → Gupshup WhatsApp
 */
async function dispatchExternal({ channel, recipient, type, payload }) {
  const provider = (process.env.NOTIFY_PROVIDER || 'log').toLowerCase();

  if (provider === 'log') {
    console.log(`[notify:log] ${channel} → ${recipient || '(no recipient)'} | ${type} | ${payload}`);
    return;
  }
  if (!recipient) throw new Error('No recipient phone for notification');

  if (provider === 'msg91')   return dispatchMsg91({ channel, recipient, type, payload });
  if (provider === 'gupshup') return dispatchGupshup({ recipient, payload });
  throw new Error(`Unknown NOTIFY_PROVIDER '${provider}'`);
}

// Resolve the approved MSG91 template per notification type, with a default.
function msg91TemplateFor(type) {
  const map = {
    submission_ack:  process.env.MSG91_WA_TEMPLATE_ACK,
    otp_link:        process.env.MSG91_WA_TEMPLATE_OTP,
    needs_attention: process.env.MSG91_WA_TEMPLATE_ALERT,
  };
  return map[type] || process.env.MSG91_WA_TEMPLATE || 'iwp_notification';
}

// ── MSG91 ──────────────────────────────────────────────────────
// WhatsApp business-initiated messages must use an APPROVED template.
// We pass `payload` as the single body variable {{1}} of that template.
async function dispatchMsg91({ channel, recipient, type, payload }) {
  const authkey    = process.env.MSG91_AUTHKEY;
  const integrated = process.env.MSG91_WA_NUMBER;       // your integrated WhatsApp number
  const template   = msg91TemplateFor(type);
  if (!authkey) throw new Error('MSG91_AUTHKEY not set');
  const to = toE164(recipient);

  if (channel === 'sms') {
    const res = await fetch('https://control.msg91.com/api/v5/flow/', {
      method: 'POST',
      headers: { authkey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        template_id: process.env.MSG91_SMS_TEMPLATE,
        recipients: [{ mobiles: to, message: payload }],
      }),
    });
    if (!res.ok) throw new Error(`MSG91 SMS ${res.status}: ${await res.text()}`);
    return;
  }

  if (!integrated) throw new Error('MSG91_WA_NUMBER not set');
  const res = await fetch('https://control.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/', {
    method: 'POST',
    headers: { authkey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      integrated_number: integrated,
      content_type: 'template',
      payload: {
        to,
        type: 'template',
        template: {
          name: template,
          language: { code: 'en', policy: 'deterministic' },
          components: [{ type: 'body', parameters: [{ type: 'text', text: payload }] }],
        },
      },
    }),
  });
  if (!res.ok) throw new Error(`MSG91 WhatsApp ${res.status}: ${await res.text()}`);
}

// ── Gupshup ────────────────────────────────────────────────────
async function dispatchGupshup({ recipient, payload }) {
  const apikey  = process.env.GUPSHUP_API_KEY;
  const source  = process.env.GUPSHUP_SOURCE;           // your WhatsApp number
  const appName = process.env.GUPSHUP_APP_NAME || 'IndianWastePortal';
  if (!apikey || !source) throw new Error('GUPSHUP_API_KEY / GUPSHUP_SOURCE not set');

  const body = new URLSearchParams({
    channel: 'whatsapp',
    source,
    destination: toE164(recipient),
    'src.name': appName,
    message: JSON.stringify({ type: 'text', text: payload }),
  });
  const res = await fetch('https://api.gupshup.io/wa/api/v1/msg', {
    method: 'POST',
    headers: { apikey, 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) throw new Error(`Gupshup ${res.status}: ${await res.text()}`);
}
