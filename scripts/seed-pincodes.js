const { parse } = require('csv-parse');
const fs = require('fs');
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, '../wasteebank.db');
const csvPath = path.resolve(__dirname, '../public/mosaic/all-india-pincode-2025.csv');

console.log('Opening database:', dbPath);
const db = new Database(dbPath);

console.log('Clearing existing data...');
db.prepare('DELETE FROM pincode_directory').run();

const insertStmt = db.prepare(`
  INSERT INTO pincode_directory (statename, district, divisionname, officename, pincode, latitude, longitude)
  VALUES (@statename, @district, @divisionname, @officename, @pincode, @latitude, @longitude)
`);

let count = 0;
const records = [];

console.log('Reading CSV file (this is fast)...');

const parser = fs.createReadStream(csvPath)
  .pipe(parse({
    columns: true,
    skip_empty_lines: true
  }));

const insertBatch = db.transaction((batch) => {
  for (const row of batch) {
    if (!row.statename || !row.district || !row.officename || !row.pincode) continue;
    insertStmt.run({
      statename: String(row.statename).trim().toUpperCase(),
      district: String(row.district).trim().toUpperCase(),
      divisionname: String(row.divisionname || row.regionname || row.district).trim().toUpperCase(),
      officename: String(row.officename).trim(),
      pincode: String(row.pincode).trim(),
      latitude: String(row.latitude || ''),
      longitude: String(row.longitude || '')
    });
    count++;
  }
});

parser.on('readable', function() {
  let record;
  while ((record = parser.read()) !== null) {
    records.push(record);
    if (records.length >= 10000) {
      insertBatch(records);
      records.length = 0; // clear array
    }
  }
});

parser.on('error', function(err) {
  console.error('❌ Seeding failed:', err.message);
  db.close();
});

parser.on('end', function() {
  if (records.length > 0) {
    insertBatch(records);
  }
  console.log(`✅ Seeding completed successfully! Inserted ${count} rows.`);
  db.close();
});
