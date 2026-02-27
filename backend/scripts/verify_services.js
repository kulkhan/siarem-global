const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
Promise.all([
  p.service.count(),
  p.service.count({ where: { status: 'COMPLETED' } }),
  p.service.count({ where: { status: 'IN_PROGRESS' } }),
  p.service.count({ where: { status: 'OPEN' } }),
  p.service.count({ where: { shipId: null } }),
  p.serviceType.count(),
  p.service.findMany({
    take: 5,
    include: { customer: { select: { shortCode: true } }, ship: { select: { name: true } }, serviceType: { select: { code: true } } },
    orderBy: { createdAt: 'desc' },
  }),
]).then(([total, completed, inProg, open, noShip, stypes, samples]) => {
  console.log('Services:', total);
  console.log('  COMPLETED:', completed, '| IN_PROGRESS:', inProg, '| OPEN:', open);
  console.log('  Without ship:', noShip);
  console.log('ServiceTypes:', stypes);
  console.log('\nSample (latest 5):');
  samples.forEach(s => {
    console.log(`  [${s.status}] ${s.customer.shortCode} / ${s.ship ? s.ship.name : '(no ship)'} / ${s.serviceType ? s.serviceType.code : '(no type)'}`);
    if (s.mohaStatus) console.log(`    mohaStatus: ${s.mohaStatus}`);
    if (s.notes) console.log(`    notes: ${s.notes.slice(0, 80)}`);
  });
  p.$disconnect();
});
