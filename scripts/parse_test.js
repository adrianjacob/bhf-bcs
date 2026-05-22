import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const csvPath = path.join(__dirname, '../ADI_RA_SRA availability for BCS sessions.csv');
const content = fs.readFileSync(csvPath, 'utf8');
const lines = content.split('\n');

const header = lines[0].split(',');
console.log('Header columns:');
header.forEach((h, i) => {
  if (h) console.log(`  ${i}: ${h}`);
});

console.log('\nRows with values:');
let currentCommittee = '';
let currentRole = '';
let currentName = '';

for (let r = 1; r < lines.length; r++) {
  const line = lines[r].trim();
  if (!line) continue;
  const cols = line.split(',');
  
  if (cols[0]) currentCommittee = cols[0];
  if (cols[1]) currentRole = cols[1];
  if (cols[2]) currentName = cols[2];
  
  const day = cols[3];
  
  const activeSlots = [];
  for (let c = 4; c < cols.length; c++) {
    if (cols[c]) {
      activeSlots.push({
        colIndex: c,
        time: header[c],
        value: cols[c]
      });
    }
  }
  
  if (activeSlots.length > 0) {
    console.log(`${currentName} (${currentRole}) - ${day}:`);
    activeSlots.forEach(s => {
      console.log(`  Col ${s.colIndex} (${s.time}): ${s.value}`);
    });
  }
}
