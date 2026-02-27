const http = require('http');

function request(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve(JSON.parse(data)));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function main() {
  // Login
  const loginRes = await request(
    { hostname: 'localhost', port: 3001, path: '/api/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json' } },
    JSON.stringify({ email: 'admin@oddyship.com', password: 'Admin123!' })
  );
  const token = loginRes.data?.token;

  // Fetch ships sorted by GT desc
  const shipsRes = await request({
    hostname: 'localhost', port: 3001,
    path: '/api/ships?pageSize=5&sortBy=grossTonnage&sortOrder=desc',
    method: 'GET',
    headers: { Authorization: 'Bearer ' + token },
  });

  console.log('Total ships:', shipsRes.total);
  console.log('\nTop 5 by Gross Tonnage:');
  shipsRes.data.forEach((s) => {
    console.log(`  ${s.name.padEnd(30)} GT=${String(s.grossTonnage ?? '-').padStart(7)}  DWT=${String(s.dwt ?? '-').padStart(10)}  Type=${s.shipType?.name ?? '-'}`);
  });

  // Count ships with GT
  const allRes = await request({
    hostname: 'localhost', port: 3001,
    path: '/api/ships?pageSize=500',
    method: 'GET',
    headers: { Authorization: 'Bearer ' + token },
  });
  const withGT = allRes.data.filter((s) => s.grossTonnage).length;
  const withType = allRes.data.filter((s) => s.shipType).length;
  console.log(`\nShips with grossTonnage: ${withGT}/${allRes.total}`);
  console.log(`Ships with shipType: ${withType}/${allRes.total}`);
}

main().catch(console.error);
