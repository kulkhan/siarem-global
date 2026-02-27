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

export async function deleteQuote(id: string, userId?: string, companyId?: string | null) {
  const tenantFilter = companyId ? { companyId } : {};
  const q = await prisma.quote.findFirst({ where: { id, deletedAt: null, ...tenantFilter } });
  if (!q) throw new AppError('Quote not found', 404);
  return prisma.quote.update({
    where: { id },
    data: { deletedAt: new Date(), deletedById: userId },
  });
}
