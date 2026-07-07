/**
 * Transactional email — provider-abstracted, mirrors lib/notify.js.
 *   EMAIL_PROVIDER: 'log' (default, no external send) | 'resend'
 *   EMAIL_FROM:     e.g. 'Indian Waste Portal <no-reply@indianwasteportal.com>'
 *   RESEND_API_KEY: required when EMAIL_PROVIDER=resend
 *
 * Resend is the default real provider (simple HTTP API, no SDK/deps). To use
 * SendGrid/SES/SMTP instead, add a branch in sendEmail() — the call sites don't change.
 */
export async function sendEmail({ to, subject, html, text }) {
  if (!to) throw new Error('email "to" is required');
  const provider = (process.env.EMAIL_PROVIDER || 'log').toLowerCase();
  const from = process.env.EMAIL_FROM || 'Indian Waste Portal <no-reply@indianwasteportal.com>';

  if (provider === 'log') {
    console.log(`[email:log] to=${to} | subject="${subject}"`);
    return { id: 'log', status: 'logged' };
  }

  if (provider === 'resend') {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error('RESEND_API_KEY not set');
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [to], subject, html, text }),
    });
    if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
    const data = await res.json().catch(() => ({}));
    return { id: data?.id || null, status: 'sent' };
  }

  throw new Error(`Unknown EMAIL_PROVIDER '${provider}'`);
}

/**
 * Branded "registration received" receipt. Returns { subject, html, text }.
 */
export function receiptEmail({ orgName, authPerson, category, token }) {
  const greeting = authPerson ? `Hi ${authPerson},` : 'Hello,';
  const trackUrl = token
    ? `${process.env.APP_BASE_URL || 'https://indianwasteportal.com'}/status/${token}`
    : null;
  const subject = 'We’ve received your registration — Indian Waste Portal';

  const html = `
  <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;color:#0f172a">
    <div style="background:#0e3b2e;padding:20px 24px;border-radius:14px 14px 0 0">
      <span style="color:#fff;font-size:18px;font-weight:700">Indian Waste<span style="color:#c8a24b">Portal</span></span>
    </div>
    <div style="border:1px solid #e5e7eb;border-top:0;padding:24px;border-radius:0 0 14px 14px;background:#fff">
      <p style="font-size:15px">${greeting}</p>
      <p style="font-size:15px;line-height:1.6">
        Thank you — we’ve received your CPCB SWM registration request${orgName ? ` for <b>${orgName}</b>` : ''}.
        Our compliance consultant will <b>call you within 24 hours</b> to confirm details and schedule your filing.
      </p>
      <table style="font-size:14px;margin:16px 0;border-collapse:collapse">
        ${orgName ? `<tr><td style="color:#64748b;padding:4px 12px 4px 0">Organisation</td><td><b>${orgName}</b></td></tr>` : ''}
        ${category ? `<tr><td style="color:#64748b;padding:4px 12px 4px 0">Category</td><td>${category}</td></tr>` : ''}
      </table>
      ${trackUrl ? `<a href="${trackUrl}" style="display:inline-block;background:#16654a;color:#fff;text-decoration:none;padding:10px 18px;border-radius:10px;font-weight:600;font-size:14px">Track your status</a>` : ''}
      <p style="font-size:12px;color:#94a3b8;margin-top:20px;line-height:1.6">
        🔒 We never ask for your OTP over a call — you always enter it yourself on your own screen.<br/>
        Indian Waste Portal is a compliance middleware and is not affiliated with CPCB or GPCB.
        This portal is only responsible for your registration.
      </p>
    </div>
  </div>`;

  const text = `${greeting}

We’ve received your CPCB SWM registration${orgName ? ` for ${orgName}` : ''}. Our consultant will call you within 24 hours to confirm details and schedule your filing.
${trackUrl ? `\nTrack your status: ${trackUrl}\n` : ''}
We never ask for your OTP over a call — you always enter it yourself on your own screen.
Indian Waste Portal is a compliance middleware, not affiliated with CPCB/GPCB.`;

  return { subject, html, text };
}

const APP = () => process.env.APP_BASE_URL || 'https://indianwasteportal.com';

function shell(inner) {
  return `
  <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;color:#0f172a">
    <div style="background:#0e3b2e;padding:20px 24px;border-radius:14px 14px 0 0">
      <span style="color:#fff;font-size:18px;font-weight:700">Indian Waste<span style="color:#c8a24b">Portal</span></span>
    </div>
    <div style="border:1px solid #e5e7eb;border-top:0;padding:24px;border-radius:0 0 14px 14px;background:#fff">${inner}</div>
  </div>`;
}
const disclaimer = `<p style="font-size:12px;color:#94a3b8;margin-top:20px;line-height:1.6">Indian Waste Portal is a compliance middleware and is not affiliated with CPCB or GPCB. This portal is only responsible for your registration.</p>`;

/** "Here's your tracking link" — used by find-my-registration. */
export function statusLinkEmail({ orgName, token }) {
  const url = `${APP()}/status/${token}`;
  return {
    subject: 'Your Indian Waste Portal tracking link',
    html: shell(`
      <p style="font-size:15px">Here’s the secure tracking link${orgName ? ` for <b>${orgName}</b>` : ''}:</p>
      <a href="${url}" style="display:inline-block;background:#16654a;color:#fff;text-decoration:none;padding:10px 18px;border-radius:10px;font-weight:600;font-size:14px;margin:8px 0">Open my status</a>
      <p style="font-size:12px;color:#94a3b8">If you didn’t request this, you can ignore this email.</p>${disclaimer}`),
    text: `Here’s your Indian Waste Portal tracking link${orgName ? ` for ${orgName}` : ''}:\n${url}\n\nIf you didn’t request this, ignore this email.`,
  };
}

/** ACK delivered on filing completion. */
export function ackEmail({ orgName, ackNumber, portalStatus }) {
  return {
    subject: `Your CPCB registration is complete — ACK ${ackNumber}`,
    html: shell(`
      <p style="font-size:15px">Good news${orgName ? `, ${orgName}` : ''} — your CPCB SWM filing is complete. ✅</p>
      <div style="background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.25);border-radius:12px;padding:16px;margin:12px 0">
        <p style="font-size:12px;font-weight:700;color:#047857;margin:0 0 4px">CPCB Acknowledgement Number</p>
        <p style="font-family:monospace;font-size:20px;font-weight:700;color:#065f46;margin:0">${ackNumber}</p>
        ${portalStatus ? `<p style="font-size:12px;color:#059669;margin:6px 0 0">Portal status: ${portalStatus}</p>` : ''}
      </div>
      <p style="font-size:13px;color:#475569">Save this number — it's required for annual returns and ULB inspections. We'll remind you before next year's 30 June deadline.</p>${disclaimer}`),
    text: `Your CPCB SWM filing is complete${orgName ? ` for ${orgName}` : ''}.\nAcknowledgement Number: ${ackNumber}\n${portalStatus ? `Portal status: ${portalStatus}\n` : ''}\nSave this number for annual returns and inspections.`,
  };
}

/** Email verification link. */
export function verifyEmail({ verifyUrl }) {
  return {
    subject: 'Verify your email — Indian Waste Portal',
    html: shell(`
      <p style="font-size:15px">Welcome! Please confirm this is your email so we can keep your registration and updates secure.</p>
      <a href="${verifyUrl}" style="display:inline-block;background:#16654a;color:#fff;text-decoration:none;padding:10px 18px;border-radius:10px;font-weight:600;font-size:14px;margin:8px 0">Verify my email</a>
      <p style="font-size:12px;color:#94a3b8">This link expires in 7 days. If you didn’t create an account, you can ignore this email.</p>${disclaimer}`),
    text: `Verify your Indian Waste Portal email: ${verifyUrl}\n(Expires in 7 days.)`,
  };
}

/** Password reset link. */
export function resetPasswordEmail({ resetUrl }) {
  return {
    subject: 'Reset your Indian Waste Portal password',
    html: shell(`
      <p style="font-size:15px">We received a request to reset your password.</p>
      <a href="${resetUrl}" style="display:inline-block;background:#16654a;color:#fff;text-decoration:none;padding:10px 18px;border-radius:10px;font-weight:600;font-size:14px;margin:8px 0">Set a new password</a>
      <p style="font-size:12px;color:#94a3b8">This link expires in 30 minutes. If you didn’t request it, you can ignore this email.</p>${disclaimer}`),
    text: `Reset your Indian Waste Portal password: ${resetUrl}\n(This link expires in 30 minutes. Ignore if you didn't request it.)`,
  };
}

/** Annual return reminder (before 30 June). */
export function reminderEmail({ orgName, deadlineLabel, token }) {
  const url = token ? `${APP()}/status/${token}` : APP();
  return {
    subject: `Reminder: your SWM annual return is due by ${deadlineLabel}`,
    html: shell(`
      <p style="font-size:15px">Hi${orgName ? ` ${orgName}` : ''},</p>
      <p style="font-size:15px;line-height:1.6">This is a friendly reminder that Bulk Waste Generators must file their <b>annual waste return</b> with the CPCB/ULB by <b>${deadlineLabel}</b>. Missing it can flag your entity for non-compliance review.</p>
      <a href="${url}" style="display:inline-block;background:#16654a;color:#fff;text-decoration:none;padding:10px 18px;border-radius:10px;font-weight:600;font-size:14px;margin:8px 0">File / track my return</a>${disclaimer}`),
    text: `Reminder: your SWM annual return is due by ${deadlineLabel}. File/track: ${url}`,
  };
}
