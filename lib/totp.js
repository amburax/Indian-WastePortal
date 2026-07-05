/**
 * TOTP (RFC 6238) — authenticator-app 2FA, pure Node crypto, no dependency.
 * SHA-1, 6 digits, 30s period; verification accepts a ±1 step window for clock skew.
 */
import { createHmac, randomBytes } from 'crypto';

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/** Random base32 secret (default 20 bytes = 160 bits). */
export function generateSecret(bytes = 20) {
  return base32encode(randomBytes(bytes));
}

function base32encode(buf) {
  let bits = 0, value = 0, out = '';
  for (const b of buf) {
    value = (value << 8) | b; bits += 8;
    while (bits >= 5) { out += B32[(value >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

function base32decode(str) {
  const clean = String(str).toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = 0, value = 0; const out = [];
  for (const c of clean) {
    value = (value << 5) | B32.indexOf(c); bits += 5;
    if (bits >= 8) { out.push((value >>> (bits - 8)) & 0xff); bits -= 8; }
  }
  return Buffer.from(out);
}

/** HOTP (RFC 4226) — dynamic-truncation 6-digit code for a counter. */
export function hotp(secretBuf, counter) {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const h = createHmac('sha1', secretBuf).update(buf).digest();
  const off = h[h.length - 1] & 0xf;
  const code = ((h[off] & 0x7f) << 24) | ((h[off + 1] & 0xff) << 16) | ((h[off + 2] & 0xff) << 8) | (h[off + 3] & 0xff);
  return (code % 1_000_000).toString().padStart(6, '0');
}

/** Verify a 6-digit token against a base32 secret (±window steps of 30s). */
export function verifyTOTP(secret, token, window = 1) {
  const tok = String(token || '').trim();
  if (!secret || !/^\d{6}$/.test(tok)) return false;
  const secretBuf = base32decode(secret);
  const t = Math.floor(Date.now() / 1000 / 30);
  for (let w = -window; w <= window; w++) {
    if (hotp(secretBuf, t + w) === tok) return true;
  }
  return false;
}

/** otpauth:// URI for QR enrolment in Google Authenticator / Authy / etc. */
export function otpauthURL(secret, label, issuer = 'Indian Waste Portal') {
  return `otpauth://totp/${encodeURIComponent(issuer + ':' + label)}` +
    `?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}
