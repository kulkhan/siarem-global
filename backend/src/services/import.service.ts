import ExcelJS from 'exceljs';
import { prisma } from '../lib/prisma';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ValidRow {
  rowNum: number;
  data: Record<string, unknown>;
}

interface SkippedRow {
  rowNum: number;
  data: Record<string, unknown>;
  reason: string;
}

interface ErrorRow {
  rowNum: number;
  data: Record<string, unknown>;
  reason: string;
}

export interface PreviewResult {
  valid: ValidRow[];
  skipped: SkippedRow[];
  errors: ErrorRow[];
  summary: { total: number; valid: number; skipped: number; errors: number };
}

export interface ExecuteResult {
  imported: number;
  errors: Array<{ rowNum: number; reason: string }>;
}

// ── Column definitions ────────────────────────────────────────────────────────

const ENTITY_COLUMNS: Record<string, Array<{ key: string; header: string; required?: boolean; note?: string; example: string | number | boolean }>> = {
  customers: [
    { key: 'shortCode',  header: 'shortCode *',  required: true,  example: 'CLT001',          note: 'Benzersiz kısa kod' },
    { key: 'name',       header: 'name *',        required: true,  example: 'Örnek Şirketi A.Ş.', note: 'Müşteri tam adı' },
    { key: 'email',      header: 'email',                          example: 'info@ornek.com'  },
    { key: 'phone',      header: 'phone',                          example: '+90 212 000 0000' },
    { key: 'address',    header: 'address',                        example: 'Atatürk Cad. No:1' },
    { key: 'city',       header: 'city',                           example: 'İstanbul'        },
    { key: 'country',    header: 'country',                        example: 'Türkiye'         },
    { key: 'taxNumber',  header: 'taxNumber',                      example: '1234567890'      },
    { key: 'notes',      header: 'notes',                          example: 'VIP müşteri'     },
    { key: 'isActive',   header: 'isActive',                       example: 'TRUE',           note: 'TRUE veya FALSE' },
  ],
  products: [
    { key: 'code',          header: 'code *',      required: true,  example: 'PRD001',  note: 'Benzersiz ürün kodu' },
    { key: 'nameTr',        header: 'nameTr *',    required: true,  example: 'Ürün Adı Türkçe' },
    { key: 'nameEn',        header: 'nameEn',                       example: 'Product Name English' },
    { key: 'unit',          header: 'unit',                         example: 'ADET',    note: 'ADET, KG, MT, LT vb.' },
    { key: 'unitPriceEur',  header: 'unitPriceEur',                 example: 100.00    },
    { key: 'unitPriceUsd',  header: 'unitPriceUsd',                 example: 110.00    },
    { key: 'unitPriceTry',  header: 'unitPriceTry',                 example: 3500.00   },
    { key: 'stockQuantity', header: 'stockQuantity',                example: 50        },
    { key: 'minStock',      header: 'minStock',                     example: 10,        note: 'Kritik stok eşiği' },
    { key: 'isActive',      header: 'isActive',                     example: 'TRUE',    note: 'TRUE veya FALSE' },
  ],
  quotes: [
    { key: 'quoteNumber',       header: 'quoteNumber *',       required: true,  example: 'TKL-2024-001' },
    { key: 'customerShortCode', header: 'customerShortCode *', required: true,  example: 'CLT001',       note: 'customers.shortCode değeri' },
    { key: 'quoteDate',         header: 'quoteDate *',         required: true,  example: '2024-01-15',   note: 'YYYY-MM-DD' },
    { key: 'validUntil',        header: 'validUntil',                           example: '2024-02-15',   note: 'YYYY-MM-DD' },
    { key: 'currency',          header: 'currency',                             example: 'EUR',          note: 'EUR / USD / TRY' },
    { key: 'totalAmount',       header: 'totalAmount',                          example: 5000.00        },
    { key: 'status',            header: 'status',                               example: 'DRAFT',        note: 'DRAFT / SENT / APPROVED / REJECTED / CANCELLED' },
    { key: 'notes',             header: 'notes',                                example: 'Teklif notu'  },
  ],
  invoices: [
    { key: 'refNo',             header: 'refNo *',             required: true,  example: 'FAT-2024-001' },
    { key: 'customerShortCode', header: 'customerShortCode *', required: true,  example: 'CLT001',       note: 'customers.shortCode değeri' },
    { key: 'amount',            header: 'amount *',            required: true,  example: 5000.00        },
    { key: 'currency',          header: 'currency',                             example: 'EUR',          note: 'EUR / USD / TRY' },
    { key: 'invoiceDate',       header: 'invoiceDate *',       required: true,  example: '2024-01-15',   note: 'YYYY-MM-DD' },
    { key: 'dueDate',           header: 'dueDate',                              example: '2024-02-15',   note: 'YYYY-MM-DD' },
    { key: 'status',            header: 'status',                               example: 'DRAFT',        note: 'DRAFT / SENT / PARTIALLY_PAID / PAID / OVERDUE / CANCELLED' },
    { key: 'notes',             header: 'notes',                                example: 'Fatura notu'  },
  ],
  services: [
    { key: 'customerShortCode', header: 'customerShortCode *', required: true,  example: 'CLT001',    note: 'customers.shortCode değeri' },
    { key: 'serviceTypeCode',   header: 'serviceTypeCode *',   required: true,  example: 'EU-MRV',    note: 'Service type kodu' },
    { key: 'shipImoNumber',     header: 'shipImoNumber',                        example: '9876543',   note: 'Gemi IMO numarası (varsa)' },
    { key: 'status',            header: 'status',                               example: 'OPEN',      note: 'OPEN / IN_PROGRESS / COMPLETED / CANCELLED / ON_HOLD' },
    { key: 'priority',          header: 'priority',                             example: 'MEDIUM',    note: 'LOW / MEDIUM / HIGH / URGENT' },
    { key: 'startDate',         header: 'startDate',                            example: '2024-01-15', note: 'YYYY-MM-DD' },
    { key: 'completedAt',       header: 'completedAt',                          example: '',           note: 'YYYY-MM-DD' },
    { key: 'notes',             header: 'notes',                                example: 'Servis notu' },
  ],
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function cellStr(cell: ExcelJS.Cell): string {
  const v = cell.value;
  if (v == null) return '';
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'object' && 'text' in (v as object)) return String((v as { text: string }).text);
  if (typeof v === 'object' && 'result' in (v as object)) return String((v as { result: unknown }).result ?? '');
  return String(v).trim();
}

function parseDate(val: string): Date | null {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

function parseBool(val: string): boolean {
  return val.toUpperCase() !== 'FALSE' && val !== '0' && val !== '';
}

function parseDecimal(val: string): number | null {
  if (!val) return null;
  const n = parseFloat(val.replace(',', '.'));
  return isNaN(n) ? null : n;
}

const QUOTE_STATUSES = new Set(['DRAFT', 'SENT', 'APPROVED', 'REJECTED', 'REVISED', 'CANCELLED']);
const INVOICE_STATUSES = new Set(['DRAFT', 'SENT', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED']);
const SERVICE_STATUSES = new Set(['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'ON_HOLD']);
const PRIORITIES = new Set(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);
const CURRENCIES = new Set(['EUR', 'USD', 'TRY']);

// ── buildTemplate ─────────────────────────────────────────────────────────────

/**
 * Belirtilen entity için indirilebilir Excel şablon dosyası oluşturur.
 * @param entity - Şablon oluşturulacak entity ('customers', 'products', 'quotes', 'invoices', 'services')
 * @returns ExcelJS Workbook nesnesi
 * @throws {Error} Bilinmeyen entity için
 */
export function buildTemplate(entity: string): ExcelJS.Workbook {
  const cols = ENTITY_COLUMNS[entity];
  if (!cols) throw new Error(`Bilinmeyen entity: ${entity}`);

  const wb = new ExcelJS.Workbook();
  wb.creator = 'oddyCRM';
  const ws = wb.addWorksheet('Veri', { views: [{ state: 'frozen', ySplit: 1 }] });

  // Column definitions
  ws.columns = cols.map((c) => ({ header: c.header, key: c.key, width: 22 }));

  // Header row styling
  const headerRow = ws.getRow(1);
  headerRow.eachCell((cell, colNum) => {
    const colDef = cols[colNum - 1];
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colDef?.required ? 'FF1D4ED8' : 'FF374151' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = { bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } } };
    if (colDef?.note) {
      cell.note = { texts: [{ text: colDef.note }] };
    }
  });
  headerRow.height = 22;

  // Example row
  const exampleData: Record<string, unknown> = {};
  cols.forEach((c) => { exampleData[c.key] = c.example; });
  const exRow = ws.addRow(exampleData);
  exRow.eachCell((cell) => {
    cell.font = { italic: true, color: { argb: 'FF6B7280' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
  });

  // Instructions sheet
  const wsInfo = wb.addWorksheet('Talimatlar');
  wsInfo.getColumn(1).width = 80;
  wsInfo.addRow(['oddyCRM — Veri Aktarımı Şablonu']).font = { bold: true, size: 14 };
  wsInfo.addRow([]);
  wsInfo.addRow(['• "Veri" sekmesini doldurun. 1. satır başlık, 2. satır örnektir — silin veya üstüne yazın.']);
  wsInfo.addRow(['• Mavi başlıklı sütunlar zorunludur (*).']);
  wsInfo.addRow(['• Tarihler YYYY-MM-DD formatında girilmelidir (örn. 2024-01-15).']);
  wsInfo.addRow(['• isActive için TRUE veya FALSE yazın.']);
  wsInfo.addRow(['• customerShortCode alanı, sistemdeki müşteri kısa koduyla eşleşmelidir.']);
  wsInfo.addRow([]);
  wsInfo.addRow([`Sürüm: ${new Date().toISOString().slice(0, 10)}`]).font = { color: { argb: 'FF9CA3AF' } };

  return wb;
}

// ── previewImport ─────────────────────────────────────────────────────────────

/**
 * Yüklenen Excel dosyasını parse edip validasyon sonuçlarını döner (dry-run).
 * @param entity - Hedef entity türü
 * @param buffer - Excel dosyasının binary buffer'ı
 * @param companyId - Tenant izolasyonu için şirket ID
 * @returns Preview sonucu: valid / skipped / errors / summary
 */
export async function previewImport(entity: string, buffer: Buffer, companyId: string): Promise<PreviewResult> {
  const cols = ENTITY_COLUMNS[entity];
  if (!cols) throw new Error(`Bilinmeyen entity: ${entity}`);

  const wb = new ExcelJS.Workbook();
  // exceljs also accepts ArrayBuffer; slice avoids Buffer<ArrayBufferLike> generic mismatch
  const ab = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  await wb.xlsx.load(ab as ArrayBuffer);
  const ws = wb.worksheets[0];

  const valid: ValidRow[] = [];
  const skipped: SkippedRow[] = [];
  const errors: ErrorRow[] = [];

  // Collect keys from the current unique values upfront for duplicate-within-file detection
  const seenKeys = new Set<string>();

  // Pre-fetch lookup maps for FK validation
  const lookupMaps = await buildLookupMaps(entity, companyId);

  ws.eachRow((row, rowNum) => {
    if (rowNum === 1) return; // header

    const raw: Record<string, string> = {};
    cols.forEach((c, i) => {
      raw[c.key] = cellStr(row.getCell(i + 1));
    });

    // Skip empty rows
    const hasContent = Object.values(raw).some((v) => v !== '');
    if (!hasContent) return;

    const result = validateRow(entity, raw, lookupMaps, seenKeys);
    if (result.type === 'valid') {
      valid.push({ rowNum, data: result.data });
    } else if (result.type === 'skipped') {
      skipped.push({ rowNum, data: raw, reason: result.reason });
    } else {
      errors.push({ rowNum, data: raw, reason: result.reason });
    }
  });

  const total = valid.length + skipped.length + errors.length;
  return {
    valid,
    skipped,
    errors,
    summary: { total, valid: valid.length, skipped: skipped.length, errors: errors.length },
  };
}

// ── executeImport ─────────────────────────────────────────────────────────────

/**
 * Daha önce doğrulanmış satırları veritabanına yazar.
 * @param entity - Hedef entity türü
 * @param rows - previewImport'tan gelen valid satırlar
 * @param companyId - Tenant izolasyonu için şirket ID
 * @param userId - İşlemi yapan kullanıcı ID
 * @returns İçe aktarma sonucu: imported sayısı ve bireysel hatalar
 */
export async function executeImport(
  entity: string,
  rows: ValidRow[],
  companyId: string,
  userId: string,
): Promise<ExecuteResult> {
  let imported = 0;
  const errors: Array<{ rowNum: number; reason: string }> = [];

  // Re-fetch lookup maps (data may have changed since preview)
  const lookupMaps = await buildLookupMaps(entity, companyId);

  for (const row of rows) {
    try {
      await insertRow(entity, row, companyId, userId, lookupMaps);
      imported++;
    } catch (e) {
      errors.push({ rowNum: row.rowNum, reason: String(e) });
    }
  }

  return { imported, errors };
}

// ── Lookup maps ───────────────────────────────────────────────────────────────

interface LookupMaps {
  customersByCode: Map<string, string>;   // shortCode → id
  serviceTypesByCode: Map<string, number>; // code → id
  shipsByImo: Map<string, string>;         // imoNumber → id
  existingKeys: Set<string>;               // unique keys already in DB
}

async function buildLookupMaps(entity: string, companyId: string): Promise<LookupMaps> {
  const customersByCode = new Map<string, string>();
  const serviceTypesByCode = new Map<string, number>();
  const shipsByImo = new Map<string, string>();
  const existingKeys = new Set<string>();

  // Always load customers (needed for quotes, invoices, services)
  const customers = await prisma.customer.findMany({
    where: { companyId, deletedAt: null },
    select: { id: true, shortCode: true },
  });
  customers.forEach((c) => customersByCode.set(c.shortCode, c.id));

  if (entity === 'customers') {
    customers.forEach((c) => existingKeys.add(c.shortCode));
  }

  if (entity === 'products') {
    const products = await prisma.product.findMany({
      where: { companyId },
      select: { code: true },
    });
    products.forEach((p) => existingKeys.add(p.code));
  }

  if (entity === 'quotes') {
    const quotes = await prisma.quote.findMany({
      where: { companyId, deletedAt: null },
      select: { quoteNumber: true },
    });
    quotes.forEach((q) => existingKeys.add(q.quoteNumber));
  }

  if (entity === 'invoices') {
    const invoices = await prisma.invoice.findMany({
      where: { companyId, deletedAt: null },
      select: { refNo: true },
    });
    invoices.forEach((inv) => { if (inv.refNo) existingKeys.add(inv.refNo); });
  }

  if (entity === 'services' || entity === 'quotes' || entity === 'invoices') {
    const types = await prisma.serviceType.findMany({
      where: { OR: [{ companyId }, { companyId: null }] },
      select: { id: true, code: true },
    });
    types.forEach((t) => { if (t.code) serviceTypesByCode.set(t.code, t.id); });

    const ships = await prisma.ship.findMany({
      where: { companyId, deletedAt: null },
      select: { id: true, imoNumber: true },
    });
    ships.forEach((s) => { if (s.imoNumber) shipsByImo.set(s.imoNumber, s.id); });
  }

  return { customersByCode, serviceTypesByCode, shipsByImo, existingKeys };
}

// ── Row validation ────────────────────────────────────────────────────────────

type ValidationResult =
  | { type: 'valid'; data: Record<string, unknown> }
  | { type: 'skipped'; reason: string }
  | { type: 'error'; reason: string };

function validateRow(
  entity: string,
  raw: Record<string, string>,
  maps: LookupMaps,
  seenKeys: Set<string>,
): ValidationResult {
  switch (entity) {
    case 'customers': return validateCustomer(raw, maps, seenKeys);
    case 'products':  return validateProduct(raw, maps, seenKeys);
    case 'quotes':    return validateQuote(raw, maps, seenKeys);
    case 'invoices':  return validateInvoice(raw, maps, seenKeys);
    case 'services':  return validateService(raw, maps);
    default: return { type: 'error', reason: `Bilinmeyen entity: ${entity}` };
  }
}

function validateCustomer(raw: Record<string, string>, maps: LookupMaps, seen: Set<string>): ValidationResult {
  const { shortCode, name, email, isActive } = raw;
  if (!shortCode) return { type: 'error', reason: 'shortCode zorunludur' };
  if (!name) return { type: 'error', reason: 'name zorunludur' };
  if (maps.existingKeys.has(shortCode)) return { type: 'skipped', reason: `shortCode '${shortCode}' zaten mevcut` };
  if (seen.has(shortCode)) return { type: 'skipped', reason: `shortCode '${shortCode}' dosyada tekrar ediyor` };
  seen.add(shortCode);
  return {
    type: 'valid',
    data: {
      shortCode,
      name,
      email: email || undefined,
      phone: raw.phone || undefined,
      address: raw.address || undefined,
      city: raw.city || undefined,
      country: raw.country || undefined,
      taxNumber: raw.taxNumber || undefined,
      notes: raw.notes || undefined,
      isActive: isActive ? parseBool(isActive) : true,
    },
  };
}

function validateProduct(raw: Record<string, string>, maps: LookupMaps, seen: Set<string>): ValidationResult {
  const { code, nameTr } = raw;
  if (!code) return { type: 'error', reason: 'code zorunludur' };
  if (!nameTr) return { type: 'error', reason: 'nameTr zorunludur' };
  if (maps.existingKeys.has(code)) return { type: 'skipped', reason: `code '${code}' zaten mevcut` };
  if (seen.has(code)) return { type: 'skipped', reason: `code '${code}' dosyada tekrar ediyor` };
  seen.add(code);

  const eur = parseDecimal(raw.unitPriceEur);
  const usd = parseDecimal(raw.unitPriceUsd);
  const tryP = parseDecimal(raw.unitPriceTry);
  const stock = parseDecimal(raw.stockQuantity);
  const minS = parseDecimal(raw.minStock);

  return {
    type: 'valid',
    data: {
      code,
      name: nameTr,
      nameEn: raw.nameEn || undefined,
      unit: raw.unit || 'ADET',
      unitPriceEur: eur,
      unitPriceUsd: usd,
      unitPriceTry: tryP,
      stockQuantity: stock,
      minStock: minS,
      isActive: raw.isActive ? parseBool(raw.isActive) : true,
    },
  };
}

function validateQuote(raw: Record<string, string>, maps: LookupMaps, seen: Set<string>): ValidationResult {
  const { quoteNumber, customerShortCode, quoteDate } = raw;
  if (!quoteNumber) return { type: 'error', reason: 'quoteNumber zorunludur' };
  if (!customerShortCode) return { type: 'error', reason: 'customerShortCode zorunludur' };
  if (!quoteDate) return { type: 'error', reason: 'quoteDate zorunludur' };

  const customerId = maps.customersByCode.get(customerShortCode);
  if (!customerId) return { type: 'error', reason: `Müşteri bulunamadı: '${customerShortCode}'` };

  if (maps.existingKeys.has(quoteNumber)) return { type: 'skipped', reason: `quoteNumber '${quoteNumber}' zaten mevcut` };
  if (seen.has(quoteNumber)) return { type: 'skipped', reason: `quoteNumber '${quoteNumber}' dosyada tekrar ediyor` };
  seen.add(quoteNumber);

  const parsedDate = parseDate(quoteDate);
  if (!parsedDate) return { type: 'error', reason: `Geçersiz quoteDate: '${quoteDate}' (YYYY-MM-DD)` };

  const status = (raw.status || 'DRAFT').toUpperCase();
  if (!QUOTE_STATUSES.has(status)) return { type: 'error', reason: `Geçersiz status: '${raw.status}'` };

  const currency = (raw.currency || 'EUR').toUpperCase();
  if (!CURRENCIES.has(currency)) return { type: 'error', reason: `Geçersiz currency: '${raw.currency}'` };

  return {
    type: 'valid',
    data: {
      quoteNumber,
      customerId,
      quoteDate: parsedDate,
      validUntil: raw.validUntil ? parseDate(raw.validUntil) : undefined,
      currency,
      totalAmount: raw.totalAmount ? parseDecimal(raw.totalAmount) : undefined,
      status,
      notes: raw.notes || undefined,
    },
  };
}

function validateInvoice(raw: Record<string, string>, maps: LookupMaps, seen: Set<string>): ValidationResult {
  const { refNo, customerShortCode, amount, invoiceDate } = raw;
  if (!refNo) return { type: 'error', reason: 'refNo zorunludur' };
  if (!customerShortCode) return { type: 'error', reason: 'customerShortCode zorunludur' };
  if (!amount) return { type: 'error', reason: 'amount zorunludur' };
  if (!invoiceDate) return { type: 'error', reason: 'invoiceDate zorunludur' };

  const customerId = maps.customersByCode.get(customerShortCode);
  if (!customerId) return { type: 'error', reason: `Müşteri bulunamadı: '${customerShortCode}'` };

  if (maps.existingKeys.has(refNo)) return { type: 'skipped', reason: `refNo '${refNo}' zaten mevcut` };
  if (seen.has(refNo)) return { type: 'skipped', reason: `refNo '${refNo}' dosyada tekrar ediyor` };
  seen.add(refNo);

  const parsedDate = parseDate(invoiceDate);
  if (!parsedDate) return { type: 'error', reason: `Geçersiz invoiceDate: '${invoiceDate}' (YYYY-MM-DD)` };

  const amountNum = parseDecimal(amount);
  if (amountNum === null || amountNum < 0) return { type: 'error', reason: `Geçersiz amount: '${amount}'` };

  const status = (raw.status || 'DRAFT').toUpperCase();
  if (!INVOICE_STATUSES.has(status)) return { type: 'error', reason: `Geçersiz status: '${raw.status}'` };

  const currency = (raw.currency || 'EUR').toUpperCase();
  if (!CURRENCIES.has(currency)) return { type: 'error', reason: `Geçersiz currency: '${raw.currency}'` };

  return {
    type: 'valid',
    data: {
      refNo,
      customerId,
      amount: amountNum,
      currency,
      invoiceDate: parsedDate,
      dueDate: raw.dueDate ? parseDate(raw.dueDate) : undefined,
      status,
      notes: raw.notes || undefined,
    },
  };
}

function validateService(raw: Record<string, string>, maps: LookupMaps): ValidationResult {
  const { customerShortCode, serviceTypeCode } = raw;
  if (!customerShortCode) return { type: 'error', reason: 'customerShortCode zorunludur' };
  if (!serviceTypeCode) return { type: 'error', reason: 'serviceTypeCode zorunludur' };

  const customerId = maps.customersByCode.get(customerShortCode);
  if (!customerId) return { type: 'error', reason: `Müşteri bulunamadı: '${customerShortCode}'` };

  const serviceTypeId = maps.serviceTypesByCode.get(serviceTypeCode);
  if (!serviceTypeId) return { type: 'error', reason: `Hizmet tipi bulunamadı: '${serviceTypeCode}'` };

  let shipId: string | undefined;
  if (raw.shipImoNumber) {
    shipId = maps.shipsByImo.get(raw.shipImoNumber);
    if (!shipId) return { type: 'error', reason: `Gemi bulunamadı (IMO): '${raw.shipImoNumber}'` };
  }

  const status = (raw.status || 'OPEN').toUpperCase();
  if (!SERVICE_STATUSES.has(status)) return { type: 'error', reason: `Geçersiz status: '${raw.status}'` };

  const priority = (raw.priority || 'MEDIUM').toUpperCase();
  if (!PRIORITIES.has(priority)) return { type: 'error', reason: `Geçersiz priority: '${raw.priority}'` };

  return {
    type: 'valid',
    data: {
      customerId,
      serviceTypeId,
      shipId,
      status,
      priority,
      startDate: raw.startDate ? parseDate(raw.startDate) : undefined,
      completedAt: raw.completedAt ? parseDate(raw.completedAt) : undefined,
      notes: raw.notes || undefined,
    },
  };
}

// ── Row insertion ─────────────────────────────────────────────────────────────

async function insertRow(
  entity: string,
  row: ValidRow,
  companyId: string,
  userId: string,
  maps: LookupMaps,
): Promise<void> {
  const d = row.data;

  switch (entity) {
    case 'customers':
      await prisma.customer.create({
        data: {
          companyId,
          shortCode:  String(d.shortCode),
          name:       String(d.name),
          email:      d.email != null ? String(d.email) : null,
          phone:      d.phone != null ? String(d.phone) : null,
          address:    d.address != null ? String(d.address) : null,
          city:       d.city != null ? String(d.city) : null,
          country:    d.country != null ? String(d.country) : null,
          taxNumber:  d.taxNumber != null ? String(d.taxNumber) : null,
          notes:      d.notes != null ? String(d.notes) : null,
          isActive:   d.isActive as boolean ?? true,
        },
      });
      break;

    case 'products':
      await prisma.product.create({
        data: {
          companyId,
          code:          String(d.code),
          name:          String(d.name),
          nameEn:        d.nameEn != null ? String(d.nameEn) : null,
          unit:          String(d.unit ?? 'ADET'),
          unitPriceEur:  d.unitPriceEur as number | null,
          unitPriceUsd:  d.unitPriceUsd as number | null,
          unitPriceTry:  d.unitPriceTry as number | null,
          stockQuantity: d.stockQuantity as number | null,
          minStock:      d.minStock as number | null,
          isActive:      d.isActive as boolean ?? true,
        },
      });
      break;

    case 'quotes': {
      // Re-check duplicate at execute time
      const existing = await prisma.quote.findFirst({
        where: { companyId, quoteNumber: String(d.quoteNumber), deletedAt: null },
      });
      if (existing) throw new Error(`quoteNumber '${d.quoteNumber}' artık mevcut`);

      await prisma.quote.create({
        data: {
          companyId,
          quoteNumber:  String(d.quoteNumber),
          customerId:   String(d.customerId),
          quoteDate:    d.quoteDate as Date,
          validUntil:   d.validUntil as Date | undefined,
          currency:     String(d.currency ?? 'EUR'),
          totalAmount:  d.totalAmount as number | null,
          status:       String(d.status ?? 'DRAFT') as 'DRAFT',
          notes:        d.notes != null ? String(d.notes) : null,
          createdById:  userId,
        },
      });
      break;
    }

    case 'invoices': {
      const existing = await prisma.invoice.findFirst({
        where: { companyId, refNo: String(d.refNo), deletedAt: null },
      });
      if (existing) throw new Error(`refNo '${d.refNo}' artık mevcut`);

      await prisma.invoice.create({
        data: {
          companyId,
          refNo:       String(d.refNo),
          customerId:  String(d.customerId),
          amount:      d.amount as number,
          currency:    String(d.currency ?? 'EUR'),
          invoiceDate: d.invoiceDate as Date,
          dueDate:     d.dueDate as Date | undefined,
          status:      String(d.status ?? 'DRAFT') as 'DRAFT',
          notes:       d.notes != null ? String(d.notes) : null,
          createdById: userId,
        },
      });
      break;
    }

    case 'services':
      await prisma.service.create({
        data: {
          companyId,
          customerId:    String(d.customerId),
          serviceTypeId: d.serviceTypeId as number,
          shipId:        d.shipId != null ? String(d.shipId) : null,
          status:        String(d.status ?? 'OPEN') as 'OPEN',
          priority:      String(d.priority ?? 'MEDIUM') as 'MEDIUM',
          startDate:     d.startDate as Date | undefined,
          completedAt:   d.completedAt as Date | undefined,
          notes:         d.notes != null ? String(d.notes) : null,
        },
      });
      break;

    default:
      throw new Error(`Bilinmeyen entity: ${entity}`);
  }
}
