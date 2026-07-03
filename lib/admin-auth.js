/**
 * Admin auth — stateless signed-cookie session (HMAC) + password hashing.
 *
 * Passwords use scrypt (a slow, salted KDF built into Node — no dependency).
 * verifyPassword also accepts the legacy sha256 hashes and callers upgrade them
 * on next successful login, so no existing account breaks.
 */
import { createHmac, createHash, scryptSync, randomBytes, timingSafeEqual } from 'crypto';

const SALT = process.env.ADMIN_SALT || process.env.PASSWORD_SALT || 'iwp_admin_salt'; // legacy only

// Resolve the HMAC secret; refuse to run in production with a missing/default
// secret (otherwise anyone could forge session cookies). Fails closed.
function SECRET_() {
  const s = process.env.ADMIN_SECRET || process.env.PASSWORD_SALT || 'iwp_dev_admin_secret_change_me';
  if (process.env.NODE_ENV === 'production' &&
      (!process.env.ADMIN_SECRET || /change_me|dev_secret/i.test(process.env.ADMIN_SECRET))) {
    throw new Error('[SECURITY] ADMIN_SECRET must be set to a strong, non-default value in production.');
  }
  return s;
}

export const ADMIN_COOKIE = 'iwp_admin';
export const SESSION_TTL_SEC = 60 * 60 * 8; // 8 hours

// ── Password hashing (scrypt) ──────────────────────────────────
export function hashPassword(pw) {
  const salt = randomBytes(16);
  const hash = scryptSync(String(pw), salt, 64);
  return `s2$${salt.toString('hex')}$${hash.toString('hex')}`;
}

function legacyHash(pw) {
  return createHash('sha256').update(SALT + String(pw)).digest('hex');
}

/** True while a stored hash is still in the old sha256 format (upgrade it on next login). */
export function isLegacyHash(stored) {
  return !!stored && !String(stored).startsWith('s2$');
}

/** Verify a password against a stored hash (scrypt or legacy sha256). Constant-time. */
export function verifyPassword(pw, stored) {
  if (!stored) return false;
  if (String(stored).startsWith('s2$')) {
    const [, saltHex, hashHex] = String(stored).split('$');
    if (!saltHex || !hashHex) return false;
    try {
      const expected = Buffer.from(hashHex, 'hex');
      const got = scryptSync(String(pw), Buffer.from(saltHex, 'hex'), expected.length);
      return got.length === expected.length && timingSafeEqual(got, expected);
    } catch { return false; }
  }
  // legacy sha256(salt+pw)
  try {
    const got = Buffer.from(legacyHash(pw));
    const exp = Buffer.from(String(stored));
    return got.length === exp.length && timingSafeEqual(got, exp);
  } catch { return false; }
}

// ── Session token (HMAC) ───────────────────────────────────────
export function signToken(email, ttlSec = SESSION_TTL_SEC) {
  const payload = Buffer.from(JSON.stringify({ e: email, exp: Date.now() + ttlSec * 1000 })).toString('base64url');
  const sig = createHmac('sha256', SECRET_()).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function verifyToken(token) {
  if (!token || !token.includes('.')) return null;
  const [payload, sig] = token.split('.');
  const expected = createHmac('sha256', SECRET_()).update(payload).digest('base64url');
  if (sig !== expected) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (!data.exp || Date.now() > data.exp) return null;
    return { email: data.e };
  } catch {
    return null;
  }
}

/** Read the admin session from a request's Cookie header. Returns {email} or null. */
export function getAdmin(request) {
  const cookie = request.headers.get('cookie') || '';
  const m = cookie.match(new RegExp(`${ADMIN_COOKIE}=([^;]+)`));
  return m ? verifyToken(decodeURIComponent(m[1])) : null;
}
