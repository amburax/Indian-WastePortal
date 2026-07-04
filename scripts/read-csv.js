const fs = require('fs');
const readline = require('readline');

async function processLineByLine() {
  const fileStream = fs.createReadStream('d:/anti-swaste/public/mosaic/all-india-pincode-2025.csv');
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let lineCount = 0;
  for await (const line of rl) {
    if (lineCount < 3) {
      console.log(`Line ${lineCount}: ${line}`);
    } else {
      break;
    }
    lineCount++;
  }
}

processLineByLine();
