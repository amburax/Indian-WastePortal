const XLSX = require('xlsx');

try {
  const workbook = XLSX.readFile('d:/anti-swaste/public/mosaic/all-data.xlsx');
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, range: 0, raw: false });
  
  if (data.length > 0) {
    console.log("Headers:", data[0]);
    if (data.length > 1) console.log("Row 1:", data[1]);
    if (data.length > 2) console.log("Row 2:", data[2]);
    console.log("Total rows:", data.length);
  } else {
    console.log("File is empty.");
  }
} catch (error) {
  console.error("Error reading excel file:", error.message);
}
