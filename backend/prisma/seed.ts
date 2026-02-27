import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ── Ship Types (IMO Categories) ──────────────────────
  const shipTypes = [
    { name: 'Bulk Carrier', ciiType: 'DWT' },
    { name: 'Gas Carrier', ciiType: 'DWT' },
    { name: 'Tanker', ciiType: 'DWT' },
    { name: 'Containership', ciiType: 'DWT' },
    { name: 'General Cargo Ship', ciiType: 'DWT' },
    { name: 'Refrigerated Cargo Carrier', ciiType: 'GT' },
    { name: 'Combination Carrier', ciiType: 'DWT' },
    { name: 'LNG Carrier', ciiType: 'DWT' },
    { name: 'RO-RO Cargo Ship (Vehicle Carrier)', ciiType: 'GT' },
    { name: 'RO-RO Cargo Ship', ciiType: 'GT' },
    { name: 'RO-RO Passenger Ship', ciiType: 'GT' },
    { name: 'RO-RO Passenger Ship (High Speed Craft SOLAS X)', ciiType: 'GT' },
    { name: 'Cruise Passenger Ship', ciiType: 'DWT' },
    { name: 'Oil/Chemical Tanker', ciiType: 'DWT' },
  ];

  for (const st of shipTypes) {
    await prisma.shipType.upsert({
      where: { name: st.name },
      update: {},
      create: st,
    });
  }
  console.log(`  ✓ ${shipTypes.length} ship types`);

  // ── Service Types ────────────────────────────────────
  const serviceTypes = [
    {
      code: 'SEEMP_PART2_PREP',
      nameEn: 'SEEMP Part II Preparation',
      nameTr: 'SEEMP Bölüm II Hazırlama',
      category: 'SEEMP',
    },
    {
      code: 'SEEMP_PART2_AMEND',
      nameEn: 'SEEMP Part II Amendment',
      nameTr: 'SEEMP Bölüm II Revizyon',
      category: 'SEEMP',
    },
    {
      code: 'SEEMP_PART3_PREP',
      nameEn: 'SEEMP Part III Preparation',
      nameTr: 'SEEMP Bölüm III Hazırlama',
      category: 'SEEMP',
    },
    {
      code: 'SEEMP_PART3_UPDATE',
      nameEn: 'SEEMP Part III Update',
      nameTr: 'SEEMP Bölüm III Güncelleme',
      category: 'SEEMP',
    },
    {
      code: 'EU_MRV_MP',
      nameEn: 'EU MRV Monitoring Plan Preparation',
      nameTr: 'AB MRV İzleme Planı Hazırlama',
      category: 'MRV',
    },
    {
      code: 'EU_ETS_MP',
      nameEn: 'EU MRV ETS Monitoring Plan Preparation',
      nameTr: 'AB MRV ETS İzleme Planı Hazırlama',
      category: 'MRV',
    },
    {
      code: 'UK_MRV_MP',
      nameEn: 'UK MRV Monitoring Plan Preparation',
      nameTr: 'UK MRV İzleme Planı Hazırlama',
      category: 'MRV',
    },
    {
      code: 'FUEL_EU_MP',
      nameEn: 'Fuel EU Maritime Monitoring Plan Preparation',
      nameTr: 'Yakıt AB Denizcilik İzleme Planı Hazırlama',
      category: 'FUEL_EU',
    },
    {
      code: 'IMO_DCS',
      nameEn: 'IMO DCS Consultancy',
      nameTr: 'IMO DCS Danışmanlık',
      category: 'DCS',
    },
    {
      code: 'MRV_DCS',
      nameEn: 'MRV DCS Consultancy',
      nameTr: 'MRV DCS Danışmanlık',
      category: 'DCS',
    },
    {
      code: 'EEXI_CALC',
      nameEn: 'EEXI Calculation & Preparation',
      nameTr: 'EEXI Hesaplama ve Hazırlama',
      category: 'ENERGY',
    },
    {
      code: 'MSMP_PREP',
      nameEn: 'MSMP Preparation',
      nameTr: 'MSMP Hazırlama',
      category: 'ENERGY',
    },
    {
      code: 'MOHA_ACCOUNT',
      nameEn: 'MOHA Account Opening',
      nameTr: 'MOHA Hesap Açılışı',
      category: 'MOHA',
    },
    // Extended service types from operational data
    {
      code: 'SEEMP_PART1_PREP',
      nameEn: 'SEEMP Part I Preparation',
      nameTr: 'SEEMP Bölüm I Hazırlama',
      category: 'SEEMP',
    },
    {
      code: 'SEEMP_PART2_UPDATE',
      nameEn: 'SEEMP Part II Update',
      nameTr: 'SEEMP Bölüm II Güncelleme',
      category: 'SEEMP',
    },
    {
      code: 'SEEMP_PART3_CORR',
      nameEn: 'SEEMP Part III & Corrective Action Plan',
      nameTr: 'SEEMP Bölüm III & Düzeltici Eylem Planı',
      category: 'SEEMP',
    },
    {
      code: 'EU_MRV_MP_UPDATE',
      nameEn: 'EU MRV Monitoring Plan Update',
      nameTr: 'AB MRV İzleme Planı Güncelleme',
      category: 'MRV',
    },
    {
      code: 'EU_MRV_FEU_UPDATE',
      nameEn: 'EU MRV & FuelEU Monitoring Plan Update',
      nameTr: 'AB MRV & YakıtAB İzleme Planı Güncelleme',
      category: 'MRV',
    },
    {
      code: 'FUEL_EU_MP_UPDATE',
      nameEn: 'Fuel EU Maritime Monitoring Plan Update',
      nameTr: 'Yakıt AB Denizcilik İzleme Planı Güncelleme',
      category: 'FUEL_EU',
    },
    {
      code: 'MRV_ETS_DCS_FUELEU',
      nameEn: 'MRV-ETS DCS FuelEU Consulting',
      nameTr: 'MRV-ETS DCS YakıtAB Danışmanlık',
      category: 'MRV',
    },
    {
      code: 'PARTIAL_IMO_DCS',
      nameEn: 'Partial IMO DCS Consultancy',
      nameTr: 'Kısmi IMO DCS Danışmanlık',
      category: 'DCS',
    },
    {
      code: 'MOHA_CONSULTANCY',
      nameEn: 'MOHA Consultancy Services',
      nameTr: 'MOHA Danışmanlık Hizmetleri',
      category: 'MOHA',
    },
    {
      code: 'MOHA_DOCS',
      nameEn: 'MOHA Document Gathering',
      nameTr: 'MOHA Belge Toplama',
      category: 'MOHA',
    },
    {
      code: 'CII_CONSULTANCY',
      nameEn: 'CII Consultancy',
      nameTr: 'CII Danışmanlık',
      category: 'ENERGY',
    },
    {
      code: 'SDMBL_CALC',
      nameEn: 'SDMBL Calculation',
      nameTr: 'SDMBL Hesaplama',
      category: 'ENERGY',
    },
    {
      code: 'EIV_CALC',
      nameEn: 'EIV Calculation',
      nameTr: 'EIV Hesaplama',
      category: 'ENERGY',
    },
    {
      code: 'EPL_APPLICATION',
      nameEn: 'EPL Application',
      nameTr: 'EPL Başvurusu',
      category: 'REGULATORY',
    },
    {
      code: 'EPL_TECH_FILE',
      nameEn: 'EPL Tech File & OMM Plan Preparation',
      nameTr: 'EPL Teknik Dosya & OMM Plan Hazırlama',
      category: 'REGULATORY',
    },
    {
      code: 'ASBESTOS_REMOVAL',
      nameEn: 'Asbestos Removal',
      nameTr: 'Asbest Giderimi',
      category: 'REGULATORY',
    },
    {
      code: 'BWTS_D1_PLAN',
      nameEn: 'BWTS D1 Plan',
      nameTr: 'BWTS D1 Planı',
      category: 'REGULATORY',
    },
    {
      code: 'MBL_CALC',
      nameEn: 'MBL Calculation & Inspection Management Plan',
      nameTr: 'MBL Hesaplama & Denetim Yönetim Planı',
      category: 'REGULATORY',
    },
    {
      code: 'CONSUMPTION_CALC',
      nameEn: 'Consumption Calculation Services',
      nameTr: 'Tüketim Hesaplama Hizmetleri',
      category: 'ENERGY',
    },
    {
      code: 'ENV_COMP_MGMT',
      nameEn: 'Environmental Compliance Management Plan',
      nameTr: 'Çevre Uyum Yönetim Planı',
      category: 'REGULATORY',
    },
    {
      code: 'IHM_MANUAL',
      nameEn: 'IHM Manual Preparation',
      nameTr: 'IHM El Kitabı Hazırlama',
      category: 'REGULATORY',
    },
    {
      code: 'ETS_STATEMENT',
      nameEn: 'ETS Statement',
      nameTr: 'ETS Beyanı',
      category: 'MRV',
    },
  ];

  for (const st of serviceTypes) {
    await prisma.serviceType.upsert({
      where: { code: st.code },
      update: { nameEn: st.nameEn, nameTr: st.nameTr, category: st.category },
      create: st,
    });
  }
  console.log(`  ✓ ${serviceTypes.length} service types`);

  // ── Admin User ───────────────────────────────────────
  const adminPassword = await bcrypt.hash('Admin123!', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@oddyship.com' },
    update: {},
    create: {
      name: 'Admin',
      email: 'admin@oddyship.com',
      password: adminPassword,
      role: 'ADMIN',
    },
  });
  console.log(`  ✓ Admin user: ${admin.email}`);

  // ── Team Users ───────────────────────────────────────
  const teamEmails = [
    'avelif.zencir@oddyship.com.tr',
    'azra.demir@oddyship.com.tr',
    'dyssupport@oddyship.com.tr',
    'gozde.demir@oddyship.com.tr',
    'hakan.kulcur@oddyship.com.tr',
    'ilayda.komurcuoglu@oddyship.com.tr',
    'mine.ulusoy@oddyship.com.tr',
    'muhasebe@oddyship.com.tr',
    'murat.demir@oddyship.com.tr',
    'omer.balta@oddyship.com.tr',
    'ozgur.kahraman@oddyship.com.tr',
    'sarp.oran@oddyship.com.tr',
    'serhat.uzun@oddyship.com.tr',
    'yusuf.demir@oddyship.com.tr',
  ];

  function emailToName(email: string): string {
    const local = email.split('@')[0];
    return local
      .split('.')
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join(' ');
  }

  const userPassword = await bcrypt.hash('oddy123!*', 10);
  let userCount = 0;
  for (const email of teamEmails) {
    await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        name: emailToName(email),
        email,
        password: userPassword,
        role: 'USER',
      },
    });
    userCount++;
  }
  console.log(`  ✓ ${userCount} team users`);

  // ── Customers & Ships from Excel ─────────────────────
  const seedDataPath = path.join(__dirname, 'seed_data.json');
  if (fs.existsSync(seedDataPath)) {
    const seedData = JSON.parse(fs.readFileSync(seedDataPath, 'utf8'));

    // Get ship type ID map
    const shipTypeMap = new Map<string, number>();
    const allShipTypes = await prisma.shipType.findMany();
    allShipTypes.forEach(st => shipTypeMap.set(st.name, st.id));

    // Upsert customers
    let customerCount = 0;
    const customerIdMap = new Map<string, string>(); // shortCode → id
    for (const c of seedData.customers) {
      const customer = await prisma.customer.upsert({
        where: { shortCode: c.shortCode },
        update: { name: c.name },
        create: { shortCode: c.shortCode, name: c.name },
      });
      customerIdMap.set(c.shortCode, customer.id);
      customerCount++;
    }
    console.log(`  ✓ ${customerCount} customers`);

    // Upsert ships (skip duplicates by IMO or name+customer)
    let shipCount = 0;
    const seenImos = new Set<string>();
    for (const s of seedData.ships) {
      const customerId = customerIdMap.get(s.customerCode);
      if (!customerId) continue;
      if (s.imoNumber && seenImos.has(s.imoNumber)) continue;
      if (s.imoNumber) seenImos.add(s.imoNumber);

      const shipTypeId = s.shipTypeName ? shipTypeMap.get(s.shipTypeName) : undefined;

      try {
        await prisma.ship.upsert({
          where: s.imoNumber
            ? { imoNumber: s.imoNumber }
            : { imoNumber: undefined as never },
          update: {
            flag: s.flag || undefined,
            itSystem: s.itSystem || undefined,
            emissionVerifier: s.emissionVerifier || undefined,
            isLargeVessel: s.isLargeVessel,
            shipTypeId: shipTypeId ?? undefined,
            grossTonnage: s.grossTonnage ?? undefined,
            dwt: s.dwt ?? undefined,
            netTonnage: s.netTonnage ?? undefined,
            builtYear: s.builtYear ?? undefined,
          },
          create: {
            customerId,
            name: s.name,
            imoNumber: s.imoNumber,
            flag: s.flag,
            itSystem: s.itSystem,
            emissionVerifier: s.emissionVerifier,
            isLargeVessel: s.isLargeVessel,
            shipTypeId: shipTypeId ?? undefined,
            grossTonnage: s.grossTonnage ?? undefined,
            dwt: s.dwt ?? undefined,
            netTonnage: s.netTonnage ?? undefined,
            builtYear: s.builtYear ?? undefined,
          },
        });
        shipCount++;
      } catch {
        // Skip duplicates on create
        await prisma.ship.create({
          data: {
            customerId,
            name: s.name,
            imoNumber: null, // clear IMO to avoid conflict
            flag: s.flag,
            itSystem: s.itSystem,
            emissionVerifier: s.emissionVerifier,
            isLargeVessel: s.isLargeVessel,
            shipTypeId: shipTypeId ?? undefined,
          },
        }).catch(() => {}); // skip if still fails
      }
    }
    console.log(`  ✓ ${shipCount} ships`);
  }

  console.log('✅ Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
