const fs = require('fs');
const path = require('path');

// Must match exact names in seed.ts / shipType table
const SHIP_TYPE_MAP = {
  1: 'Bulk Carrier',
  2: 'Gas Carrier',
  3: 'Tanker',
  4: 'Containership',
  5: 'General Cargo Ship',
  6: 'Refrigerated Cargo Carrier',
  7: 'Combination Carrier',
  8: 'LNG Carrier',
  9: 'RO-RO Cargo Ship (Vehicle Carrier)',
  10: 'RO-RO Cargo Ship',
  11: 'RO-RO Passenger Ship',
  12: 'RO-RO Passenger Ship (High Speed Craft SOLAS X)',
  13: 'Cruise Passenger Ship',
  14: 'Oil/Chemical Tanker',
};

const vessels = JSON.parse(fs.readFileSync('c:/repos/oddyCRM/sourcedocs/vessels.json', 'utf8'));
const seed = JSON.parse(fs.readFileSync('c:/repos/oddyCRM/backend/prisma/seed_data.json', 'utf8'));

// Build lookup tables
const byImo = {};
const byName = {};
vessels.forEach((v) => {
  if (v.imoNumber) byImo[v.imoNumber.trim()] = v;
  byName[v.name.trim().toUpperCase()] = v;
});

let imoCount = 0, nameCount = 0, noMatch = 0;

seed.ships = seed.ships.map((s) => {
  let vessel = null;
  let matchedBy = null;

  if (s.imoNumber && byImo[s.imoNumber.trim()]) {
    vessel = byImo[s.imoNumber.trim()];
    matchedBy = 'imo';
  } else if (byName[s.name.trim().toUpperCase()]) {
    vessel = byName[s.name.trim().toUpperCase()];
    matchedBy = 'name';
  }

  if (!vessel) {
    noMatch++;
    return s;
  }

  if (matchedBy === 'imo') imoCount++;
  else nameCount++;

  const gt = vessel.grossTonnage ? parseFloat(vessel.grossTonnage) : null;
  const dwt = vessel.sumDeadWeight ? parseFloat(vessel.sumDeadWeight) : null;
  const nt = vessel.netTonnage ? parseFloat(vessel.netTonnage) : null;
  const builtYear = vessel.dateOfBuild ? parseInt(vessel.dateOfBuild.slice(0, 4)) : null;

  return {
    ...s,
    imoNumber: s.imoNumber || (vessel.imoNumber ? vessel.imoNumber.trim() : null),
    grossTonnage: gt,
    dwt: dwt,
    netTonnage: nt,
    builtYear: builtYear,
    isLargeVessel: gt !== null ? gt > 5000 : s.isLargeVessel,
    shipTypeName:
      vessel.vesselTypeId && SHIP_TYPE_MAP[vessel.vesselTypeId]
        ? SHIP_TYPE_MAP[vessel.vesselTypeId]
        : s.shipTypeName,
  };
});

fs.writeFileSync('c:/repos/oddyCRM/backend/prisma/seed_data.json', JSON.stringify(seed, null, 2));

console.log('Done!');
console.log('Matched by IMO:', imoCount);
console.log('Matched by name:', nameCount);
console.log('No match:', noMatch);

// Sample
const sample = seed.ships.filter((s) => s.grossTonnage).slice(0, 5);
console.log('\nSample enriched ships:');
sample.forEach((s) => {
  console.log(`  ${s.name}: GT=${s.grossTonnage}, DWT=${s.dwt}, NT=${s.netTonnage}, builtYear=${s.builtYear}, type=${s.shipTypeName}`);
});
