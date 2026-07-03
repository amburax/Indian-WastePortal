/**
 * Client auth — stateless signed-cookie session for customer accounts.
 * Mirrors lib/admin-auth.js. Session payload carries the user id.
 */
import { createHmac } from 'crypto';
export { hashPassword, verifyPassword, isLegacyHash } from './admin-auth.js';   // reuse password hashing

// Resolve the HMAC secret; refuse to run in production with a missing/default
// secret. Fails closed so leaked/forged sessions are impossible in prod.
function SECRET_() {
  const s = process.env.CLIENT_SECRET || process.env.PASSWORD_SALT || 'iwp_dev_client_secret_change_me';
  if (process.env.NODE_ENV === 'production' &&
      (!process.env.CLIENT_SECRET || /change_me|dev_secret/i.test(process.env.CLIENT_SECRET))) {
    throw new Error('[SECURITY] CLIENT_SECRET must be set to a strong, non-default value in production.');
  }
  return s;
}

export const CLIENT_COOKIE   = 'iwp_client';
export const SESSION_TTL_SEC = 60 * 60 * 24 * 30; // 30 days

export function signToken(userId, epoch = 0, ttlSec = SESSION_TTL_SEC) {
  const payload = Buffer.from(JSON.stringify({ u: userId, v: epoch, exp: Date.now() + ttlSec * 1000 })).toString('base64url');
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
    return { userId: data.u, v: data.v || 0 };
  } catch { return null; }
}

/**
 * Resolve the logged-in user AND enforce session revocation: if the token's
 * epoch doesn't match users.session_epoch (bumped on password change / logout-
 * everywhere), the session is treated as invalid. Returns the user row or null.
 */
export async function requireUser(request, db) {
  const sess = getClient(request);
  if (!sess) return null;
  const user = await db.get('SELECT * FROM users WHERE id = ?', [sess.userId]);
  if (!user) return null;
  if ((user.session_epoch || 0) !== (sess.v || 0)) return null;
  return user;
}

// ── Password-reset tokens (short-lived, purpose-scoped) ────────
export function signReset(userId, ttlSec = 1800) {
  const payload = Buffer.from(JSON.stringify({ u: userId, p: 'reset', exp: Date.now() + ttlSec * 1000 })).toString('base64url');
  const sig = createHmac('sha256', SECRET_()).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}
export function verifyReset(token) {
  if (!token || !token.includes('.')) return null;
  const [payload, sig] = token.split('.');
  const expected = createHmac('sha256', SECRET_()).update(payload).digest('base64url');
  if (sig !== expected) return null;
  try {
    const d = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (d.p !== 'reset' || !d.exp || Date.now() > d.exp) return null;
    return { userId: d.u };
  } catch { return null; }
}

// ── Email-verification tokens (purpose-scoped, 7 days) ─────────
export function signVerify(userId, ttlSec = 60 * 60 * 24 * 7) {
  const payload = Buffer.from(JSON.stringify({ u: userId, p: 'verify', exp: Date.now() + ttlSec * 1000 })).toString('base64url');
  const sig = createHmac('sha256', SECRET_()).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}
export function verifyVerify(token) {
  if (!token || !token.includes('.')) return null;
  const [payload, sig] = token.split('.');
  const expected = createHmac('sha256', SECRET_()).update(payload).digest('base64url');
  if (sig !== expected) return null;
  try {
    const d = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (d.p !== 'verify' || !d.exp || Date.now() > d.exp) return null;
    return { userId: d.u };
  } catch { return null; }
}

/** Read the client session from a request's Cookie header. Returns {userId} or null. */
export function getClient(request) {
  const cookie = request.headers.get('cookie') || '';
  const m = cookie.match(new RegExp(`${CLIENT_COOKIE}=([^;]+)`));
  return m ? verifyToken(decodeURIComponent(m[1])) : null;
}

export function sessionCookieOptions() {
  return {
    httpOnly: true, sameSite: 'lax', path: '/',
    maxAge: SESSION_TTL_SEC, secure: process.env.NODE_ENV === 'production',
  };
}
