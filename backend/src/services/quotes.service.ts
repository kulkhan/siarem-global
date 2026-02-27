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

async function generateQuoteNumber(quoteDate: Date): Promise<string> {
  const dd = String(quoteDate.getDate()).padStart(2, '0');
  const mm = String(quoteDate.getMonth() + 1).padStart(2, '0');
  const yyyy = quoteDate.getFullYear();
  const count = await prisma.quote.count();
  const seq = String(count + 1).padStart(5, '0');
  return `${seq}-ODDYSHIP-${dd}${mm}${yyyy}`;
}

export async function getQuotes(q: QuoteQuery) {
  const { page, pageSize, search, customerId, serviceId, status, sortOrder = 'desc' } = q;
  const sortBy = SORT_WHITELIST.includes(q.sortBy ?? '') ? q.sortBy! : 'quoteDate';

  const where = {
    deletedAt: null,
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

export async function getQuoteById(id: string) {
  const quote = await prisma.quote.findFirst({
    where: { id, deletedAt: null },
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
}) {
  const { quoteDate, validUntil, quoteNumber: providedQuoteNumber, ...rest } = data;
  const date = new Date(quoteDate);
  const quoteNumber = providedQuoteNumber || (await generateQuoteNumber(date));

  return prisma.quote.create({
    data: {
      ...rest,
      quoteNumber,
      quoteDate: date,
      ...(validUntil ? { validUntil: new Date(validUntil) } : {}),
    },
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
  },
  userId?: string
) {
  const existing = await prisma.quote.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw new AppError('Quote not found', 404);

  const { quoteDate, validUntil, ...rest } = data;
  return prisma.quote.update({
    where: { id },
    data: {
      ...rest,
      updatedById: userId,
      ...(quoteDate ? { quoteDate: new Date(quoteDate) } : {}),
      ...(validUntil !== undefined ? { validUntil: validUntil ? new Date(validUntil) : null } : {}),
    },
  });
}

export async function deleteQuote(id: string, userId?: string) {
  const q = await prisma.quote.findFirst({ where: { id, deletedAt: null } });
  if (!q) throw new AppError('Quote not found', 404);
  return prisma.quote.update({
    where: { id },
    data: { deletedAt: new Date(), deletedById: userId },
  });
}
