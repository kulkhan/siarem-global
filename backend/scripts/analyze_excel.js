const xlsx = require('xlsx');
const wb = xlsx.readFile('c:/repos/oddyCRM/sourcedocs/İŞ SÜREÇ TAKİP.xlsx');
const ws = wb.Sheets['IS SUREC TAKIP'];
const data = xlsx.utils.sheet_to_json(ws, { header: 1 });

// Header:
// [0] Column 1 = müşteri shortCode
// [1] GEMI = ship name
// [2] IMO NO
// [3] İŞ = service type
// [4] TEKLİF (EUR)
// [5] TEKLİF (US)
// [6] TEKLİF (TRY)
// [7] TEKLİF TARİHİ
// [8] TEKLİF ONAY DURUMU
// [9] FATURALAR BİRLEŞİK Mİ KESİLECEK?
// [10] İŞ DURUM Notu = statusNote
// [11] İş Durumu = status
// [12] MOHA
// [13] FATURA KESİLEBİLİR
// [14] TASLAK FATURA
// [15] FATURA REF NO
// [16] Column 17
// [17] FATURA GÖNDERİLDİ

let withData = 0;
let withImo = 0;
let withShip = 0;
let withStatus = 0;
let withService = 0;
const jobTypes = {};

data.slice(1).forEach(row => {
  if (row[0] || row[1] || row[3]) {
    withData++;
    if (row[2]) withImo++;
    if (row[1]) withShip++;
    if (row[11]) withStatus++;
    if (row[3]) {
      withService++;
      const key = row[3].toString().trim();
      jobTypes[key] = (jobTypes[key] || 0) + 1;
    }
  }
});

console.log('Total data rows:', withData);
console.log('With IMO:', withImo);
console.log('With ship name:', withShip);
console.log('With service type:', withService);
console.log('With status:', withStatus);

console.log('\nService types with counts:');
Object.entries(jobTypes).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => {
  console.log(`  ${v.toString().padStart(4)}  ${k}`);
});

// Sample In Progress
const inProgress = data.slice(1).filter(r => r[11] === 'In Progres');
console.log('\nIn Progress rows (' + inProgress.length + '):');
inProgress.slice(0, 5).forEach(r => console.log(JSON.stringify(r)));

// Sample without status
const noStatus = data.slice(1).filter(r => r[0] && r[3] && !r[11]);
console.log('\nRows without status (' + noStatus.length + '):');
noStatus.slice(0, 5).forEach(r => console.log(JSON.stringify(r)));
