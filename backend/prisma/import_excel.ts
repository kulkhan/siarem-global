/**
 * Excel İş Süreç Takip verilerini DB'ye import eder.
 * Çalıştırma: cd backend && npx tsx prisma/import_excel.ts
 *
 * İşlemler:
 *  - Müşteri: isimden shortCode üretir, yoksa oluşturur
 *  - Gemi: IMO veya isim+müşteri ile eşleştirir, yoksa oluşturur
 *  - Servis: müşteri+gemi+iş adı ile eşleştirir, yoksa oluşturur
 *  - Teklif: servis başına 1 teklif, varsa atlar
 *  - Fatura: refNo ile eşleştirir, yoksa oluşturur
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

const COMPANY_ID = 'default-siarem-company';
const DATA_FILE  = path.join(__dirname, '../../Docs/is_surec_data.json');

interface ExcelRow {
  customerName:    string | null;
  shipName:        string | null;
  imoNumber:       string | null;
  jobName:         string | null;
  priceEur:        number | null;
  priceUsd:        number | null;
  priceTry:        number | null;
  quoteDate:       string | null;
  quoteStatus:     string | null;
  combinedInvoice: string | null;
  serviceNote:     string | null;
  serviceStatus:   string | null;
  mohaStatus:      string | null;
  invoiceReady:    string | null;
  draftInvoice:    string | null;
  invoiceRefNo:    string | null;
  invoiceApproved: string | null;
  invoiceSent:     string | null;
}

// ── Yardımcı dönüştürücüler ──────────────────────────────────────────────────

function toShortCode(name: string): string {
  return name
    .toUpperCase()
    .replace(/[ğ]/gi, 'G').replace(/[ü]/gi, 'U').replace(/[ş]/gi, 'S')
    .replace(/[ı]/gi, 'I').replace(/[ö]/gi, 'O').replace(/[ç]/gi, 'C')
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 10);
}

function mapServiceStatus(v: string | null): string {
  if (!v) return 'OPEN';
  const s = v.toLowerCase();
  if (s.includes('complet'))  return 'COMPLETED';
  if (s.includes('progress')) return 'IN_PROGRESS';
  if (s.includes('iptal') || s.includes('cancel')) return 'CANCELLED';
  if (s.includes('hold'))     return 'ON_HOLD';
  return 'OPEN';
}

function mapQuoteStatus(v: string | null): string {
  if (!v) return 'DRAFT';
  const s = v.toLowerCase();
  if (s.includes('onayland') || s.includes('approv')) return 'APPROVED';
  if (s.includes('bekl') || s.includes('sent'))        return 'SENT';
  if (s.includes('iptal') || s.includes('cancel'))     return 'CANCELLED';
  if (s.includes('reviz'))   return 'REVISED';
  return 'DRAFT';
}

function mapInvoiceStatus(row: ExcelRow): string {
  if (!row.invoiceRefNo) return 'DRAFT';
  const sent = row.invoiceSent?.toLowerCase() === 'evet';
  const approved = row.invoiceApproved?.toLowerCase()?.includes('onay');
  if (approved && sent) return 'SENT';
  if (sent)             return 'SENT';
  return 'DRAFT';
}

function pickCurrency(row: ExcelRow): { amount: number; currency: string } {
  if (row.priceEur) return { amount: row.priceEur, currency: 'EUR' };
  if (row.priceUsd) return { amount: row.priceUsd, currency: 'USD' };
  if (row.priceTry) return { amount: row.priceTry, currency: 'TRY' };
  return { amount: 0, currency: 'EUR' };
}

// ── Ana fonksiyon ─────────────────────────────────────────────────────────────

async function main() {
  if (!fs.existsSync(DATA_FILE)) {
    throw new Error(`Veri dosyası bulunamadı: ${DATA_FILE}`);
  }
  const raw = fs.readFileSync(DATA_FILE, 'utf8').replace(/^﻿/, '');
  const rows: ExcelRow[] = JSON.parse(raw);
  console.log(`📂 ${rows.length} satır okundu`);

  // Şirket kontrolü
  const company = await prisma.company.findUnique({ where: { id: COMPANY_ID } });
  if (!company) throw new Error(`Şirket bulunamadı: ${COMPANY_ID}`);
  console.log(`✓ Şirket: ${company.name}`);

  // Servis tiplerini yükle
  const serviceTypes = await prisma.serviceType.findMany({ where: { companyId: null } });
  const stMap = new Map(serviceTypes.map(s => [s.nameEn.toLowerCase(), s.id]));
  const stMapTr = new Map(serviceTypes.map(s => [s.nameTr.toLowerCase(), s.id]));
  const stCodeMap = new Map(serviceTypes.map(s => [s.code.toLowerCase(), s.id]));

  function findServiceTypeId(jobName: string): number | null {
    const jl = jobName.toLowerCase();
    // Tam eşleşme
    if (stMap.has(jl)) return stMap.get(jl)!;
    if (stMapTr.has(jl)) return stMapTr.get(jl)!;
    if (stCodeMap.has(jl)) return stCodeMap.get(jl)!;
    // Kısmi eşleşme
    for (const [k, v] of stMap) { if (jl.includes(k) || k.includes(jl)) return v; }
    for (const [k, v] of stMapTr) { if (jl.includes(k) || k.includes(jl)) return v; }
    return null;
  }

  // Mevcut müşterileri yükle
  const existingCustomers = await prisma.customer.findMany({
    where: { companyId: COMPANY_ID, deletedAt: null },
    select: { id: true, name: true, shortCode: true },
  });
  const customerByName = new Map(existingCustomers.map(c => [c.name.toLowerCase().trim(), c]));
  const customerByCode = new Map(existingCustomers.map(c => [c.shortCode, c]));

  async function getOrCreateCustomer(name: string) {
    const key = name.toLowerCase().trim();
    if (customerByName.has(key)) return customerByName.get(key)!;

    let code = toShortCode(name);
    let suffix = 1;
    while (customerByCode.has(code)) { code = toShortCode(name).slice(0, 8) + suffix++; }

    const c = await prisma.customer.create({
      data: { companyId: COMPANY_ID, name: name.trim(), shortCode: code },
    });
    customerByName.set(key, c);
    customerByCode.set(code, c);
    console.log(`  + Müşteri oluşturuldu: ${name} (${code})`);
    return c;
  }

  // Mevcut gemileri yükle
  const existingShips = await prisma.ship.findMany({
    where: { companyId: COMPANY_ID, deletedAt: null },
    select: { id: true, name: true, imoNumber: true, customerId: true },
  });
  const shipByImo = new Map(existingShips.filter(s => s.imoNumber).map(s => [s.imoNumber!, s]));
  const shipByNameCust = new Map(existingShips.map(s => [`${s.name.toLowerCase()}|${s.customerId}`, s]));

  async function getOrCreateShip(shipName: string, imoRaw: string | null, customerId: string) {
    const imo = imoRaw ? String(imoRaw).replace(/\.0$/, '').trim() : null;
    if (imo && shipByImo.has(imo)) return shipByImo.get(imo)!;
    const nameKey = `${shipName.toLowerCase().trim()}|${customerId}`;
    if (shipByNameCust.has(nameKey)) return shipByNameCust.get(nameKey)!;

    const s = await prisma.ship.create({
      data: {
        companyId: COMPANY_ID,
        customerId,
        name: shipName.trim(),
        imoNumber: imo || null,
      },
    });
    if (imo) shipByImo.set(imo, s);
    shipByNameCust.set(nameKey, s);
    console.log(`  + Gemi oluşturuldu: ${shipName}${imo ? ` (IMO: ${imo})` : ''}`);
    return s;
  }

  // Mevcut teklifleri yükle (servisId bazında)
  const existingQuotes = await prisma.quote.findMany({
    where: { companyId: COMPANY_ID, deletedAt: null },
    select: { id: true, serviceId: true, quoteNumber: true },
  });
  const quoteByService = new Map(existingQuotes.filter(q => q.serviceId).map(q => [q.serviceId!, q]));

  // Son teklif numarasını bul
  const lastQuote = await prisma.quote.findFirst({
    where: { companyId: COMPANY_ID },
    orderBy: { quoteNumber: 'desc' },
    select: { quoteNumber: true },
  });
  let quoteCounter = 0;
  if (lastQuote) {
    const m = lastQuote.quoteNumber.match(/(\d+)$/);
    if (m) quoteCounter = parseInt(m[1]);
  }

  function nextQuoteNumber() {
    quoteCounter++;
    return `ODA${new Date().getFullYear()}${String(quoteCounter).padStart(9, '0')}`;
  }

  // Mevcut faturaları yükle
  const existingInvoices = await prisma.invoice.findMany({
    where: { companyId: COMPANY_ID, deletedAt: null },
    select: { id: true, refNo: true },
  });
  const invoiceByRef = new Map(existingInvoices.filter(i => i.refNo).map(i => [i.refNo.toLowerCase().trim(), i]));

  // Son fatura refNo sayacı
  const lastInvoice = await prisma.invoice.findFirst({
    where: { companyId: COMPANY_ID },
    orderBy: { refNo: 'desc' },
    select: { refNo: true },
  });
  let invCounter = 0;
  if (lastInvoice?.refNo) {
    const m = lastInvoice.refNo.match(/(\d+)$/);
    if (m) invCounter = parseInt(m[1]);
  }

  function nextInvoiceRef() {
    invCounter++;
    return `INV${new Date().getFullYear()}${String(invCounter).padStart(6, '0')}`;
  }

  // Sistem kullanıcısı (admin)
  const adminUser = await prisma.user.findFirst({
    where: { companyId: COMPANY_ID, role: 'ADMIN' },
    select: { id: true },
  });
  const createdById = adminUser?.id ?? '';

  // ── İşlem sayaçları ──
  let created = { customers: 0, ships: 0, services: 0, quotes: 0, invoices: 0 };
  let skipped = { services: 0, quotes: 0, invoices: 0 };

  // ── Satır satır işle ──
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row.customerName && !row.shipName && !row.jobName) continue;

    if ((i + 1) % 100 === 0) process.stdout.write(`  [${i + 1}/${rows.length}]\r`);

    try {
      // Müşteri
      if (!row.customerName) continue;
      const customer = await getOrCreateCustomer(row.customerName);

      // Gemi
      let ship = null;
      if (row.shipName) {
        ship = await getOrCreateShip(row.shipName, row.imoNumber, customer.id);
      }

      // İş → servis tipi
      const serviceTypeId = row.jobName ? findServiceTypeId(row.jobName) : null;

      // Servis: müşteri + gemi + iş adı ile tekil kontrol
      const existingService = await prisma.service.findFirst({
        where: {
          companyId: COMPANY_ID,
          customerId: customer.id,
          shipId: ship?.id ?? null,
          deletedAt: null,
          ...(serviceTypeId ? { serviceTypeId } : {}),
          notes: row.jobName ?? undefined,
        },
      });

      let service;
      if (existingService) {
        // Güncelle
        service = await prisma.service.update({
          where: { id: existingService.id },
          data: {
            status: mapServiceStatus(row.serviceStatus) as any,
            statusNote: row.serviceNote ?? undefined,
            invoiceReady: row.invoiceReady?.toLowerCase() === 'evet',
          },
        });
        skipped.services++;
      } else {
        service = await prisma.service.create({
          data: {
            companyId: COMPANY_ID,
            customerId: customer.id,
            shipId: ship?.id ?? null,
            serviceTypeId: serviceTypeId ?? null,
            status: mapServiceStatus(row.serviceStatus) as any,
            priority: 'MEDIUM',
            notes: row.jobName ?? undefined,
            statusNote: row.serviceNote ?? undefined,
            invoiceReady: row.invoiceReady?.toLowerCase() === 'evet',
          },
        });
        created.services++;
      }

      // Teklif
      if (row.priceEur || row.priceUsd || row.priceTry) {
        if (quoteByService.has(service.id)) {
          skipped.quotes++;
        } else {
          const { amount, currency } = pickCurrency(row);
          const q = await prisma.quote.create({
            data: {
              companyId: COMPANY_ID,
              quoteNumber: nextQuoteNumber(),
              customerId: customer.id,
              serviceId: service.id,
              createdById,
              currency,
              unitPrice: amount,
              totalAmount: amount,
              priceEur: row.priceEur ?? null,
              priceUsd: row.priceUsd ?? null,
              priceTry: row.priceTry ?? null,
              quoteDate: row.quoteDate ? new Date(row.quoteDate) : new Date(),
              status: mapQuoteStatus(row.quoteStatus) as any,
              combinedInvoice: row.combinedInvoice?.toLowerCase()?.includes('birle') ?? false,
            },
          });
          quoteByService.set(service.id, q);
          created.quotes++;

          // Gemi teklif kaydı
          if (ship) {
            await prisma.quoteShip.upsert({
              where: { quoteId_shipId: { quoteId: q.id, shipId: ship.id } },
              update: {},
              create: { quoteId: q.id, shipId: ship.id },
            });
          }
        }
      }

      // Fatura
      if (row.invoiceRefNo) {
        const refKey = row.invoiceRefNo.toLowerCase().trim();
        if (invoiceByRef.has(refKey)) {
          skipped.invoices++;
        } else {
          const { amount, currency } = pickCurrency(row);
          const quoteRec = quoteByService.get(service.id);
          const invRef = row.invoiceRefNo.trim();

          const inv = await prisma.invoice.create({
            data: {
              companyId: COMPANY_ID,
              refNo: invRef,
              customerId: customer.id,
              serviceId: service.id,
              quoteId: quoteRec?.id ?? null,
              createdById,
              amount,
              currency,
              status: mapInvoiceStatus(row) as any,
              invoiceDate: row.quoteDate ? new Date(row.quoteDate) : new Date(),
              isCombined: row.combinedInvoice?.toLowerCase()?.includes('birle') ?? false,
            },
          });
          invoiceByRef.set(refKey, inv);
          created.invoices++;
        }
      }
    } catch (e: any) {
      console.error(`\n  ✗ Satır ${i + 2} hatası: ${e.message?.slice(0, 120)}`);
    }
  }

  console.log('\n');
  console.log('✅ Import tamamlandı:');
  console.log(`   Oluşturuldu → Müşteri: ${created.customers} | Gemi: ${created.ships} | Servis: ${created.services} | Teklif: ${created.quotes} | Fatura: ${created.invoices}`);
  console.log(`   Atlandı    → Servis: ${skipped.services} | Teklif: ${skipped.quotes} | Fatura: ${skipped.invoices}`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
