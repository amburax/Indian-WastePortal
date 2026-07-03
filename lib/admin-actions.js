/**
 * Admin action helpers — shared logic for releasing an org's filing to the
 * worker queue (Gate 2). This is the queue-push logic that used to live in the
 * payment webhook; it now runs only when an admin presses "Start Filing".
 */
import { getNextQueuePosition, pushFilingJob } from './queue';
import { Q } from './d1-db';

/**
 * Build the full agent payload for an org (org + metrics + address).
 */
async function buildAgentPayload(db, org) {
  const metrics = await db.get(...Q.getMetricsByOrg(org.id));
  const address = await db.get(...Q.getAddressByOrg(org.id));
  return {
    org_id:       org.id,
    org_name:     org.org_name,
    auth_person:  org.auth_person,
    email:        org.email,
    phone:        org.phone,
    category:     org.category,
    sub_category: org.sub_category,
    floor_area_sqm:       metrics?.floor_area_sqm || 0,
    waste_kg_per_day:     metrics?.waste_kg_per_day || 0,
    water_liters_per_day: metrics?.water_liters_per_day || 0,
    state_name:      address?.state_name || '',
    district_name:   address?.district_name || '',
    sub_district:    address?.sub_district || '',
    city_name:       address?.city_name || '',
    full_address:    address?.full_address || '',
    local_body_type: address?.local_body_type || '',
    pincode:         address?.pincode || '',
    latitude:        address?.latitude || null,
    longitude:       address?.longitude || null,
  };
}

/**
 * Release an org to the filing queue: assigns a queue position, pushes a job
 * (CF Queue in prod / DB row in dev), and sets status → 'Queued'.
 *
 * @returns {Promise<{queuePos:number, jobId:string}>}
 */
export async function releaseToQueue(db, org, cfEnv = null) {
  const payload  = await buildAgentPayload(db, org);
  const queuePos = await getNextQueuePosition(cfEnv, db);
  const jobId    = await pushFilingJob({ orgId: org.id, payload, queuePos, cfEnv, db });
  await db.run(...Q.updateStatusAndQueue('Queued', queuePos, jobId, org.id));
  return { queuePos, jobId };
}
