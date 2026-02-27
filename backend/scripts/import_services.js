const { PrismaClient } = require('@prisma/client');
const xlsx = require('xlsx');

const prisma = new PrismaClient();

// Excel column indices
// [0]  Customer shortCode
// [1]  Ship name
// [2]  IMO number
// [3]  Service type (İŞ)
// [4]  Quote EUR
// [5]  Quote USD
// [6]  Quote TRY
// [7]  Quote date (Excel serial or string)
// [8]  Quote approval
// [9]  Combined invoice? (Tek / Birleşik)
// [10] Status note (İŞ DURUM Notu)
// [11] Status (İş Durumu)
// [12] MOHA status
// [13] Fatura Kesilebilir (EVET/HAYIR)
// [14] Taslak Fatura (HAZIRLANDI/HAZIRLANMADI)
// [15] Fatura REF NO
// [16] Invoice approval
// [17] Fatura Gönderildi (EVET)

function norm(str) {
  if (!str) return '';
  return str.trim()
    .replace(/ğ|Ğ/g, 'G')
    .replace(/ü|Ü/g, 'U')
    .replace(/ş|Ş/g, 'S')
    .replace(/ı|İ/g, 'I')
    .replace(/ö|Ö/g, 'O')
    .replace(/ç|Ç/g, 'C')
    .toUpperCase()
    .replace(/\s+/g, '_');
}

const SERVICE_TYPE_MAP = {
  [norm('Seemp Part II Amendment')]:              'SEEMP_PART2_AMEND',
  [norm('Seemp Part II Update')]:                 'SEEMP_PART2_UPDATE',
  [norm('Seemp Part 2 - Update')]:                'SEEMP_PART2_UPDATE',
  [norm('SEEMP Part 2 Preparation')]:             'SEEMP_PART2_PREP',
  [norm('Seemp Part 1 Preparation')]:             'SEEMP_PART1_PREP',
  [norm('SEEMP Part 3 Preparation')]:             'SEEMP_PART3_PREP',
  [norm('SEEMP PART 3 - 2025 Update')]:           'SEEMP_PART3_UPDATE',
  [norm('SEEMP PART III & CORRC.ACT. PLAN')]:     'SEEMP_PART3_CORR',
  [norm('Seemp Part III Update')]:                'SEEMP_PART3_UPDATE',
  [norm('EU MRV MP Preparation')]:                'EU_MRV_MP',
  [norm('MRV MP Consultacy')]:                    'EU_MRV_MP',
  [norm('MRV MP 2023')]:                          'MRV_DCS',
  [norm('EU MRV MP Update')]:                     'EU_MRV_MP_UPDATE',
  [norm('EU MRV & FEU MP Update')]:               'EU_MRV_FEU_UPDATE',
  [norm('EU MRV ETS MP Preparation')]:            'EU_ETS_MP',
  [norm('ETS STATEMENT')]:                        'ETS_STATEMENT',
  [norm('UK MRV MP Preparation')]:                'UK_MRV_MP',
  [norm('MRV DCS CONSULTANCY 2023')]:             'MRV_DCS',
  [norm('MRV DCS CONSULTANCY 2024')]:             'MRV_DCS',
  [norm('MRV - DCS 2025 CONSULTANCY')]:           'MRV_DCS',
  [norm('DCS CONSULTANCY 2024')]:                 'MRV_DCS',
  [norm('MRV-ETS DCS FUELEU CONSULTING')]:        'MRV_ETS_DCS_FUELEU',
  [norm('PARTIAL IMO DCS')]:                      'PARTIAL_IMO_DCS',
  [norm('DCS 2025 CONSULTANCY')]:                 'IMO_DCS',
  [norm('DCS CONCULTANCY 2025')]:                 'IMO_DCS',
  [norm('Fuel EU Maritime MP Preparation')]:      'FUEL_EU_MP',
  [norm('Fuel EU MP Update')]:                    'FUEL_EU_MP_UPDATE',
  [norm('EEXI Calculation & Preparation')]:       'EEXI_CALC',
  [norm('MSMP Preparation')]:                     'MSMP_PREP',
  [norm('CII CONSULTANCY')]:                      'CII_CONSULTANCY',
  [norm('SDMBL Calculation')]:                    'SDMBL_CALC',
  [norm('EIV CALCULATION')]:                      'EIV_CALC',
  [norm('CONSUMPTION CALCULATION SERVICES')]:     'CONSUMPTION_CALC',
  [norm('MOHA HESAP AÇILIŞI')]:                   'MOHA_ACCOUNT',
  [norm('MOHA CONSULTANCY SERVICES')]:            'MOHA_CONSULTANCY',
  [norm('MOHA DOCUMENT GATHERING SERVICES')]:     'MOHA_DOCS',
  [norm('EPL Application')]:                      'EPL_APPLICATION',
  [norm('EPL TECH FILE & OMM PLAN PREPARATION')]: 'EPL_TECH_FILE',
  [norm('ASBESTOS REMOVAL')]:                     'ASBESTOS_REMOVAL',
  [norm('BWTS D1 PLAN')]:                         'BWTS_D1_PLAN',
  [norm('MBL CALCULATION & MBL INSPECTION - MANAGEMENT PLAN')]: 'MBL_CALC',
  [norm('Environmental Compliance Management Plan')]: 'ENV_COMP_MGMT',
  [norm('IHM MANUAL PREPARATION')]:              'IHM_MANUAL',
};

function excelDateToJS(val) {
  if (!val) return null;
  if (typeof val === 'number' && val > 1000) {
    const d = new Date((val - 25569) * 86400 * 1000);
    return d.getFullYear() > 1990 ? d : null;
  }
  if (typeof val === 'string') {
    const d = new Date(val);
    if (!isNaN(d.getTime()) && d.getFullYear() > 1990) return d;
  }
  return null;
}

function mapStatus(statusStr, noteStr) {
  if (statusStr) {
    const s = statusStr.trim().toLowerCase();
    if (s === 'completed') return 'COMPLETED';
    if (s.startsWith('in progres')) return 'IN_PROGRESS';
  }
  if (noteStr) {
    const n = noteStr.toLowerCase();
    if (n.includes('tamamland') || n.includes('completed')) return 'COMPLETED';
    if (n.includes('iptal') || n.includes('cancel')) return 'CANCELLED';
  }
  return 'OPEN';
}

function isEvet(val) {
  if (!val) return false;
  return val.toString().trim().toLowerCase().includes('evet');
}

function mapQuoteStatus(val) {
  if (!val) return 'DRAFT';
  const s = val.toString().trim().toLowerCase();
  if (s.includes('onay') || s.includes('approved')) return 'APPROVED';
  if (s.includes('red') || s.includes('reject')) return 'REJECTED';
  if (s.includes('revize') || s.includes('revised')) return 'REVISED';
  if (s.includes('gönderildi') || s.includes('sent')) return 'SENT';
  return 'DRAFT';
}

function formatQuoteDate(date) {
  const d = date ?? new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}${mm}${yyyy}`;
}

async function main() {
  console.log('Clearing existing services, invoices and quotes from import...');
  await prisma.serviceLog.deleteMany({});
  await prisma.invoice.deleteMany({});
  await prisma.quoteShip.deleteMany({});
  await prisma.quote.deleteMany({});
  await prisma.service.deleteMany({});
  console.log('  Cleared.');

  console.log('Loading DB lookups...');
  const customers = await prisma.customer.findMany({ select: { id: true, shortCode: true } });
  const ships = await prisma.ship.findMany({ select: { id: true, name: true, imoNumber: true, customerId: true } });
  const serviceTypes = await prisma.serviceType.findMany({ select: { id: true, code: true } });

  const customerByCode = new Map();
  customers.forEach(c => customerByCode.set(norm(c.shortCode), c));

  const shipByImo = new Map();
  const shipByNameCustomer = new Map();
  const shipByNameGlobal = new Map();
  ships.forEach(s => {
    if (s.imoNumber) shipByImo.set(s.imoNumber.trim(), s);
    const nameKey = norm(s.name);
    shipByNameCustomer.set(`${nameKey}:::${s.customerId}`, s);
    if (!shipByNameGlobal.has(nameKey)) shipByNameGlobal.set(nameKey, s);
  });

  const stByCode = new Map();
  serviceTypes.forEach(st => stByCode.set(st.code, st));

  console.log('Reading Excel...');
  const wb = xlsx.readFile('c:/repos/oddyCRM/sourcedocs/İŞ SÜREÇ TAKİP.xlsx');
  const ws = wb.Sheets['IS SUREC TAKIP'];
  const rows = xlsx.utils.sheet_to_json(ws, { header: 1 });
  console.log(`Processing ${rows.length - 1} rows...`);

  let created = 0;
  let skippedNoCustomer = 0;
  let skippedEmptyRow = 0;
  let noShipMatch = 0;
  let invoicesCreated = 0;
  let invoiceSkippedDuplicate = 0;
  let quotesCreated = 0;

  // Track refNos already used (for combined invoice dedup)
  const usedRefNos = new Set();
  let quoteCounter = 1;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];

    const customerCode = row[0] ? row[0].toString().trim() : null;
    const shipName     = row[1] ? row[1].toString().trim() : null;
    const imoRaw       = row[2] != null ? row[2].toString().trim() : null;
    const serviceRaw   = row[3] ? row[3].toString().trim() : null;
    const priceEur     = row[4] != null && row[4] !== '' ? parseFloat(row[4]) : null;
    const priceUsd     = row[5] != null && row[5] !== '' ? parseFloat(row[5]) : null;
    const priceTry     = row[6] != null && row[6] !== '' ? parseFloat(row[6]) : null;
    const quoteDate    = excelDateToJS(row[7]);
    const isCombinedRaw = row[9] ? row[9].toString().trim() : null;
    const statusNote   = row[10] ? row[10].toString().trim() : null;
    const statusRaw    = row[11] ? row[11].toString().trim() : null;
    const mohaStatus   = row[12] ? row[12].toString().trim() : null;
    const canInvoice   = row[13] ? row[13].toString().trim() : null;    // FATURA KESİLEBİLİR
    const draftInvoice = row[14] ? row[14].toString().trim() : null;    // TASLAK FATURA
    const invoiceRef   = row[15] ? row[15].toString().trim() : null;    // FATURA REF NO
    const invoiceSent  = row[17] ? row[17].toString().trim() : null;    // FATURA GÖNDERİLDİ

    if (!customerCode && !serviceRaw) { skippedEmptyRow++; continue; }

    const customer = customerByCode.get(norm(customerCode || ''));
    if (!customer) { skippedNoCustomer++; continue; }

    const typeCode = serviceRaw ? SERVICE_TYPE_MAP[norm(serviceRaw)] : undefined;
    const serviceType = typeCode ? stByCode.get(typeCode) : null;

    let ship = null;
    if (imoRaw && imoRaw !== 'null') ship = shipByImo.get(imoRaw) || null;
    if (!ship && shipName) {
      const nameKey = norm(shipName);
      ship = shipByNameCustomer.get(`${nameKey}:::${customer.id}`) || shipByNameGlobal.get(nameKey) || null;
    }
    if (!ship) noShipMatch++;

    const status = mapStatus(statusRaw, statusNote);
    const invoiceReady = isEvet(canInvoice);
    const isCombined = isCombinedRaw && norm(isCombinedRaw) !== 'TEK' && isCombinedRaw.trim() !== '';

    const service = await prisma.service.create({
      data: {
        customerId:      customer.id,
        shipId:          ship?.id ?? null,
        serviceTypeId:   serviceType?.id ?? null,
        status,
        priority:        'MEDIUM',
        statusNote:      statusNote ?? null,
        mohaStatus:      mohaStatus ?? null,
        invoiceReady,
        notes:           invoiceRef ? `Fatura: ${invoiceRef}${priceEur ? ` | EUR: ${priceEur}` : ''}${priceUsd ? ` | USD: ${priceUsd}` : ''}${priceTry ? ` | TRY: ${priceTry}` : ''}` : null,
      },
    });
    created++;

    // Create Invoice record if we have a ref no and a price
    if (invoiceRef && !usedRefNos.has(invoiceRef)) {
      usedRefNos.add(invoiceRef);
      const amount = priceEur ?? priceUsd ?? priceTry ?? 0;
      const currency = priceEur ? 'EUR' : priceUsd ? 'USD' : 'TRY';
      let invoiceStatus = 'DRAFT';
      if (isEvet(invoiceSent)) invoiceStatus = 'SENT';

      try {
        await prisma.invoice.create({
          data: {
            refNo:       invoiceRef,
            customerId:  customer.id,
            serviceId:   service.id,
            amount,
            currency,
            status:      invoiceStatus,
            invoiceDate: quoteDate ?? new Date(),
            sentAt:      isEvet(invoiceSent) ? quoteDate ?? new Date() : null,
            isCombined:  !!isCombined,
          },
        });
        invoicesCreated++;
      } catch (e) {
        // duplicate refNo across batches - skip
        invoiceSkippedDuplicate++;
      }
    }

    // Create Quote record if any price or quote date exists
    const quoteApprovalRaw = row[8] ? row[8].toString().trim() : null;
    const hasQuoteData = priceEur || priceUsd || priceTry || quoteDate;
    if (hasQuoteData) {
      const quoteNum = `${String(quoteCounter++).padStart(5, '0')}-ODDYSHIP-${formatQuoteDate(quoteDate)}`;
      const quoteStatus = mapQuoteStatus(quoteApprovalRaw);
      try {
        await prisma.quote.create({
          data: {
            quoteNumber:     quoteNum,
            customerId:      customer.id,
            serviceId:       service.id,
            priceEur:        priceEur ?? null,
            priceUsd:        priceUsd ?? null,
            priceTry:        priceTry ?? null,
            quoteDate:       quoteDate ?? new Date(),
            status:          quoteStatus,
            combinedInvoice: !!isCombined,
          },
        });
        quotesCreated++;
      } catch (e) {
        // skip on error (e.g., duplicate quoteNumber race)
      }
    }
  }

  console.log('\n✅ Import complete!');
  console.log('  Created services:', created);
  console.log('  Skipped (no customer):', skippedNoCustomer);
  console.log('  Skipped (empty row):', skippedEmptyRow);
  console.log('  Without ship:', noShipMatch);
  console.log('  Invoices created:', invoicesCreated);
  console.log('  Invoice duplicates skipped:', invoiceSkippedDuplicate);
  console.log('  Quotes created:', quotesCreated);

  // Stats
  const invoiceReady = await prisma.service.count({ where: { invoiceReady: true } });
  console.log(`\n  invoiceReady=true: ${invoiceReady}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
