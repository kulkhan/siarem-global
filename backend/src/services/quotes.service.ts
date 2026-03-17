import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/error.middleware';
import { QuoteStatus } from '@prisma/client';

export interface QuoteQuery {
  page: number;
  pageSize: number;
  search?: string;
  customerId?: string;
  serviceId?: string;
  status?: QuoteStatus;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

const SORT_WHITELIST = ['quoteDate', 'createdAt', 'status', 'quoteNumber'];

async function generateQuoteNumber(quoteDate: Date, companyId: string): Promise<string> {
  const dd = String(quoteDate.getDate()).padStart(2, '0');
  const mm = String(quoteDate.getMonth() + 1).padStart(2, '0');
  const yyyy = quoteDate.getFullYear();
  const count = await prisma.quote.count({ where: { companyId } });
  const seq = String(count + 1).padStart(5, '0');
  return `${seq}-ODDYSHIP-${dd}${mm}${yyyy}`;
}

/**
 * Returns a paginated, filterable list of quotes with customer, service, and invoice counts.
 * @param q - Query options including search, customerId, serviceId, status, sort
 * @param companyId - Tenant isolation company ID; null for SUPER_ADMIN (all tenants)
 * @returns Paginated quote list
 */
export async function getQuotes(q: QuoteQuery, companyId: string | null) {
  const { page, pageSize, search, customerId, serviceId, status, sortOrder = 'desc' } = q;
  const sortBy = SORT_WHITELIST.includes(q.sortBy ?? '') ? q.sortBy! : 'quoteDate';

  const tenantFilter = companyId ? { companyId } : {};

  const where = {
    deletedAt: null,
    ...tenantFilter,
    ...(search
      ? {
          OR: [
            { quoteNumber: { contains: search, mode: 'insensitive' as const } },
            { customer: { name: { contains: search, mode: 'insensitive' as const } } },
            { customer: { shortCode: { contains: search, mode: 'insensitive' as const } } },
          ],
        }
      : {}),
    ...(customerId ? { customerId } : {}),
    ...(serviceId ? { serviceId } : {}),
    ...(status ? { status } : {}),
  };

  const [data, total] = await Promise.all([
    prisma.quote.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { [sortBy]: sortOrder },
      include: {
        customer: { select: { id: true, name: true, shortCode: true } },
        service: {
          select: {
            id: true,
            serviceType: { select: { id: true, nameEn: true, nameTr: true, code: true } },
            ship: { select: { id: true, name: true } },
          },
        },
        createdBy: { select: { id: true, name: true } },
        _count: { select: { invoices: true } },
      },
    }),
    prisma.quote.count({ where }),
  ]);

  return { data, total, page, pageSize };
}

export interface QuoteItemInput {
  productId?: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  currency: string;
  total: number;
  sortOrder?: number;
}

/**
 * Returns a single quote by ID with customer, service, ships, invoices, and line items.
 * @param id - Quote ID
 * @param companyId - Tenant isolation company ID; null for SUPER_ADMIN
 * @returns Quote record with all related data
 * @throws {AppError} If quote is not found (404)
 */
export async function getQuoteById(id: string, companyId: string | null) {
  const tenantFilter = companyId ? { companyId } : {};
  const quote = await prisma.quote.findFirst({
    where: { id, deletedAt: null, ...tenantFilter },
    include: {
      customer: { select: { id: true, name: true, shortCode: true } },
      service: {
        select: {
          id: true,
          ship: { select: { id: true, name: true, imoNumber: true } },
          serviceType: { select: { id: true, nameEn: true, nameTr: true, code: true } },
        },
      },
      createdBy: { select: { id: true, name: true } },
      quoteShips: { include: { ship: { select: { id: true, name: true, imoNumber: true } } } },
      invoices: { select: { id: true, refNo: true, amount: true, currency: true, status: true } },
      items: { include: { product: true }, orderBy: { sortOrder: 'asc' } },
    },
  });
  if (!quote) throw new AppError('Quote not found', 404);
  return quote;
}

/**
 * Creates a quote and its line items in a single transaction; auto-generates quoteNumber if not provided.
 * @param data - Quote fields plus optional items array
 * @param companyId - Tenant isolation company ID
 * @returns Created quote record
 * @throws {AppError} If tenant is missing (400)
 */
export async function createQuote(data: {
  customerId: string;
  serviceId?: string;
  quoteNumber?: string;
  shipCount?: number;
  priceEur?: number | null;
  priceUsd?: number | null;
  priceTry?: number | null;
  quoteDate: string;
  validUntil?: string;
  status?: QuoteStatus;
  combinedInvoice?: boolean;
  notes?: string;
  createdById?: string;
  items?: QuoteItemInput[];
}, companyId?: string) {
  if (!companyId) throw new AppError('Tenant bilgisi eksik', 400);
  const { quoteDate, validUntil, quoteNumber: providedQuoteNumber, items, ...rest } = data;
  const date = new Date(quoteDate);
  const quoteNumber = providedQuoteNumber || (await generateQuoteNumber(date, companyId));

  return prisma.$transaction(async (tx) => {
    const quote = await tx.quote.create({
      data: {
        ...rest,
        companyId,
        quoteNumber,
        quoteDate: date,
        ...(validUntil ? { validUntil: new Date(validUntil) } : {}),
      },
    });

    if (items && items.length > 0) {
      await tx.quoteItem.createMany({
        data: items.map((item, i) => ({
          id: require('crypto').randomUUID(),
          quoteId: quote.id,
          productId: item.productId ?? null,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          currency: item.currency,
          total: item.total,
          sortOrder: item.sortOrder ?? i,
        })),
      });
    }

    return quote;
  });
}

/**
 * Updates a quote and replaces its line items in a transaction.
 * @param id - Quote ID
 * @param data - Partial update data; providing items replaces all existing items
 * @param userId - ID of the updating user
 * @param companyId - Tenant isolation company ID
 * @returns Updated quote record
 * @throws {AppError} If quote is not found (404)
 */
export async function updateQuote(
  id: string,
  data: {
    customerId?: string;
    serviceId?: string | null;
    quoteNumber?: string;
    shipCount?: number;
    priceEur?: number | null;
    priceUsd?: number | null;
    priceTry?: number | null;
    quoteDate?: string;
    validUntil?: string | null;
    status?: QuoteStatus;
    combinedInvoice?: boolean;
    notes?: string;
    items?: QuoteItemInput[];
  },
  userId?: string,
  companyId?: string | null
) {
  const tenantFilter = companyId ? { companyId } : {};
  const existing = await prisma.quote.findFirst({ where: { id, deletedAt: null, ...tenantFilter } });
  if (!existing) throw new AppError('Quote not found', 404);

  const { quoteDate, validUntil, items, ...rest } = data;

  return prisma.$transaction(async (tx) => {
    const quote = await tx.quote.update({
      where: { id },
      data: {
        ...rest,
        updatedById: userId,
        ...(quoteDate ? { quoteDate: new Date(quoteDate) } : {}),
        ...(validUntil !== undefined ? { validUntil: validUntil ? new Date(validUntil) : null } : {}),
      },
    });

    if (items !== undefined) {
      await tx.quoteItem.deleteMany({ where: { quoteId: id } });
      if (items.length > 0) {
        await tx.quoteItem.createMany({
          data: items.map((item, i) => ({
            id: require('crypto').randomUUID(),
            quoteId: id,
            productId: item.productId ?? null,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            currency: item.currency,
            total: item.total,
            sortOrder: item.sortOrder ?? i,
          })),
        });
      }
    }

    return quote;
  });
}

/**
 * Creates a new OPEN service from a quote and links the quote to that service.
 * If the quote is already linked to a service, returns the existing service.
 * @param id - Quote ID
 * @param userId - ID of the user performing the action
 * @param companyId - Tenant isolation company ID
 * @returns Newly created (or existing linked) service
 * @throws {AppError} If quote is not found (404)
 */
export async function convertQuoteToService(id: string, userId?: string, companyId?: string | null) {
  const tenantFilter = companyId ? { companyId } : {};
  const quote = await prisma.quote.findFirst({
    where: { id, deletedAt: null, ...tenantFilter },
    include: { quoteShips: { take: 1 } },
  });
  if (!quote) throw new AppError('Quote not found', 404);

  if (quote.serviceId) {
    const existing = await prisma.service.findFirst({ where: { id: quote.serviceId } });
    if (existing) return existing;
  }

  const service = await prisma.service.create({
    data: {
      companyId: quote.companyId,
      customerId: quote.customerId,
      shipId: quote.quoteShips[0]?.shipId ?? null,
      status: 'OPEN',
      priority: 'MEDIUM',
      createdById: userId,
      assignedUserId: userId ?? null,
      logs: {
        create: {
          userId,
          action: 'CREATED',
          note: `Teklif #${quote.quoteNumber ?? quote.id.slice(-6)} üzerinden oluşturuldu`,
        },
      },
    },
  });

  await prisma.quote.update({ where: { id }, data: { serviceId: service.id } });

  return service;
}

/**
 * Soft-deletes a quote by setting deletedAt timestamp.
 * @param id - Quote ID
 * @param userId - ID of the user performing the deletion
 * @param companyId - Tenant isolation company ID
 * @returns Updated quote record with deletedAt set
 * @throws {AppError} If quote is not found (404)
 */
export async function deleteQuote(id: string, userId?: string, companyId?: string | null) {
  const tenantFilter = companyId ? { companyId } : {};
  const q = await prisma.quote.findFirst({ where: { id, deletedAt: null, ...tenantFilter } });
  if (!q) throw new AppError('Quote not found', 404);
  return prisma.quote.update({
    where: { id },
    data: { deletedAt: new Date(), deletedById: userId },
  });
}
