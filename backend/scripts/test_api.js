const http = require('http');
function req(options, body = null) {
  return new Promise((resolve, reject) => {
    const r = http.request(options, res => {
      let d = '';
      res.on('data', c => (d += c));
      res.on('end', () => resolve(JSON.parse(d)));
    });
    r.on('error', reject);
    if (body) r.write(body);
    r.end();
  });
}
async function main() {
  const login = await req(
    { hostname: 'localhost', port: 3001, path: '/api/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json' } },
    JSON.stringify({ email: 'admin@oddyship.com', password: 'Admin123!' })
  );
  if (!login.success) { console.log('Login failed:', login); return; }
  const token = login.data.token;
  console.log('Token:', token.slice(0, 30) + '...');

  const svcs = await req({
    hostname: 'localhost', port: 3001, path: '/api/services?pageSize=3',
    method: 'GET', headers: { Authorization: 'Bearer ' + token }
  });
  console.log('Response keys:', Object.keys(svcs));
  if (svcs.data) {
    console.log('Services total:', svcs.data.total);
    svcs.data.data?.slice(0, 2).forEach(s => {
      console.log(` [${s.status}] ${s.customer?.shortCode} / ${s.ship?.name ?? '(no ship)'} / ${s.serviceType?.code ?? '?'}`);
    });
  } else {
    console.log(JSON.stringify(svcs).slice(0, 300));
  }
}
main().catch(console.error);
