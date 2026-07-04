const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.resolve(__dirname, '../wasteebank.db');
const db = new Database(dbPath);

console.log("=== Testing Admin Export Query ===");
const exportQuery = `
  SELECT 
    o.org_name, o.auth_person, o.email, o.phone, o.category, o.sub_category, o.plan,
    o.status, o.retainer_paid, o.payment_verified, o.balance_amount_paise, o.ack_number,
    o.assigned_admin, o.appointment_at, o.created_at,
    a.state_name, a.district_name, a.city_name, a.local_body_type, a.pincode, a.latitude, a.longitude,
    m.waste_kg_per_day, m.floor_area_sqm
  FROM organizations o
  LEFT JOIN lgd_addresses a ON o.id = a.org_id
  LEFT JOIN metrics m ON o.id = m.org_id
  LIMIT 5
`;
try {
  const rows = db.prepare(exportQuery).all();
  console.log(`✅ Export query successful. Rows returned: ${rows.length}`);
} catch (e) {
  console.error(`❌ Export query failed:`, e.message);
}

console.log("\n=== Testing Certificate Query ===");
try {
  const tokenRow = db.prepare("SELECT payment_token FROM organizations LIMIT 1").get();
  if (tokenRow && tokenRow.payment_token) {
    const org = db.prepare("SELECT * FROM organizations WHERE payment_token = ?").get(tokenRow.payment_token);
    const metrics = db.prepare('SELECT * FROM metrics WHERE org_id = ?').get(org.id);
    const address = db.prepare('SELECT * FROM lgd_addresses WHERE org_id = ?').get(org.id);
    console.log(`✅ Certificate queries successful for token: ${tokenRow.payment_token}`);
  } else {
    console.log(`⚠️ No organizations found to test Certificate query.`);
  }
} catch (e) {
  console.error(`❌ Certificate query failed:`, e.message);
}
