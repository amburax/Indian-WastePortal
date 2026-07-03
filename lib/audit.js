/**
 * Audit log helper — records every admin action to the `audit_log` table
 * (created in the Phase 1 migration). Non-fatal: a logging failure must never
 * block the action itself.
 */
import { randomUUID } from 'crypto';

/**
 * @param {object} db   - DB adapter from getDb(request)
 * @param {object} opts
 * @param {string}  opts.adminEmail
 * @param {string}  [opts.orgId]
 * @param {string}  opts.action  - log_call | start_filing | reset_otp | set_status | login
 * @param {object|string} [opts.meta] - serialised to JSON
 */
export async function writeAudit(db, { adminEmail, orgId = null, action, meta = null }) {
  try {
    const metaStr = meta == null ? null : (typeof meta === 'string' ? meta : JSON.stringify(meta));
    await db.run(
      'INSERT INTO audit_log (id, admin_email, org_id, action, meta) VALUES (?,?,?,?,?)',
      [randomUUID(), adminEmail, orgId, action, metaStr]
    );
  } catch (e) {
    console.warn('[audit] write failed (non-fatal):', e.message);
  }
}
