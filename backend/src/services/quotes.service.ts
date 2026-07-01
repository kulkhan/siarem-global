import { randomUUID } from 'crypto';
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

async function generateQuoteNumber(quoteDate: Date | null, companyId: string): Promise<string> {
  const count = await prisma.quote.count({ where: { companyId } });
  const seq = String(count + 1).padStart(5, '0');
  if (!quoteDate) return `${seq}-ODDYSHIP`;
  const dd = String(quoteDate.getDate()).padStart(2, '0');
  const mm = String(quoteDate.getMonth() + 1).padStart(2, '0');
  const yyyy = quoteDate.getFullYear();
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
      orderBy: sortBy === 'quoteDate'
        ? { quoteDate: { sort: sortOrder, nulls: 'last' } }
        : { [sortBy]: sortOrder },
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
  serviceTypeId?: number | null;
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
      items: {
        include: {
          product: true,
          serviceType: { select: { id: true, nameEn: true, nameTr: true, code: true } },
        },
        orderBy: { sortOrder: 'asc' },
      },
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
  shipIds?: string[];
  priceEur?: number | null;
  priceUsd?: number | null;
  priceTry?: number | null;
  quoteDate?: string;
  validUntil?: string;
  acceptedAt?: string;
  acceptanceMethod?: string;
  status?: QuoteStatus;
  combinedInvoice?: boolean;
  notes?: string;
  createdById?: string;
  items?: QuoteItemInput[];
}, companyId?: string) {
  if (!companyId) throw new AppError('Tenant bilgisi eksik', 400);
  const { quoteDate, validUntil, acceptedAt, quoteNumber: providedQuoteNumber, items, shipIds, ...rest } = data;
  const date = quoteDate ? new Date(quoteDate) : null;
  const quoteNumber = providedQuoteNumber || (await generateQuoteNumber(date, companyId));

  return prisma.$transaction(async (tx) => {
    const quote = await tx.quote.create({
      data: {
        ...rest,
        companyId,
        quoteNumber,
        ...(date ? { quoteDate: date } : {}),
        ...(validUntil ? { validUntil: new Date(validUntil) } : {}),
        ...(acceptedAt ? { acceptedAt: new Date(acceptedAt) } : {}),
        ...(shipIds && shipIds.length > 0
          ? { quoteShips: { create: shipIds.map((shipId) => ({ shipId })) } }
          : {}),
      },
    });

    if (items && items.length > 0) {
      await tx.quoteItem.createMany({
        data: items.map((item, i) => ({
          id: randomUUID(),
          quoteId: quote.id,
          productId: item.productId ?? null,
          serviceTypeId: item.serviceTypeId ?? null,
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
    shipIds?: string[];
    priceEur?: number | null;
    priceUsd?: number | null;
    priceTry?: number | null;
    quoteDate?: string | null;
    validUntil?: string | null;
    acceptedAt?: string | null;
    acceptanceMethod?: string | null;
    status?: QuoteStatus;
    combinedInvoice?: boolean;
    notes?: string;
    items?: QuoteItemInput[];
  },
  userId?: string,
  companyId?: string | null
) {
  const tenantFilter = companyId ? { companyId } : {};
  const existing = await prisma.quote.findFirst({
    where: { id, deletedAt: null, ...tenantFilter },
    include: { quoteShips: true },
  });
  if (!existing) throw new AppError('Quote not found', 404);

  const { quoteDate, validUntil, acceptedAt, items, shipIds, ...rest } = data;

  return prisma.$transaction(async (tx) => {
    const quote = await tx.quote.update({
      where: { id },
      data: {
        ...rest,
        updatedById: userId,
        ...(quoteDate !== undefined ? { quoteDate: quoteDate ? new Date(quoteDate) : null } : {}),
        ...(validUntil !== undefined ? { validUntil: validUntil ? new Date(validUntil) : null } : {}),
        ...(acceptedAt !== undefined ? { acceptedAt: acceptedAt ? new Date(acceptedAt) : null } : {}),
      },
    });

    // Replace quoteShips if shipIds provided
    if (shipIds !== undefined) {
      await tx.quoteShip.deleteMany({ where: { quoteId: id } });
      if (shipIds.length > 0) {
        await tx.quoteShip.createMany({ data: shipIds.map((shipId) => ({ quoteId: id, shipId })) });
      }
    }

    if (items !== undefined) {
      await tx.quoteItem.deleteMany({ where: { quoteId: id } });
      if (items.length > 0) {
        await tx.quoteItem.createMany({
          data: items.map((item, i) => ({
            id: randomUUID(),
            quoteId: id,
            productId: item.productId ?? null,
            serviceTypeId: item.serviceTypeId ?? null,
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

    // Auto-create services when status changed to APPROVED and no service exists
    if (data.status === 'APPROVED' && existing.status !== 'APPROVED' && !existing.serviceId) {
      const freshQuote = await tx.quote.findFirst({
        where: { id },
        include: { quoteShips: true, items: { select: { serviceTypeId: true } } },
      });
      if (freshQuote) {
        const uniqueTypeIds = [...new Set(
          freshQuote.items.map((i) => i.serviceTypeId).filter((v): v is number => v != null)
        )];
        const typeIdsToCreate = uniqueTypeIds.length > 0 ? uniqueTypeIds : [null];
        const shipIds2 = freshQuote.quoteShips.map((qs) => qs.shipId);
        const shipIdsToUse = shipIds2.length > 0 ? shipIds2 : [null as string | null];

        const created: string[] = [];
        for (const shipId of shipIdsToUse) {
          for (const serviceTypeId of typeIdsToCreate) {
            const svc = await tx.service.create({
              data: {
                companyId: freshQuote.companyId,
                customerId: freshQuote.customerId,
                shipId: shipId ?? undefined,
                serviceTypeId: serviceTypeId ?? undefined,
                status: 'OPEN',
                priority: 'MEDIUM',
                createdById: userId,
                logs: {
                  create: {
                    userId,
                    action: 'CREATED',
                    note: `Teklif #${freshQuote.quoteNumber} onayından otomatik oluşturuldu`,
                  },
                },
              },
            });
            created.push(svc.id);
          }
        }
        if (created.length > 0) {
          await tx.quote.update({ where: { id }, data: { serviceId: created[0] } });
        }
      }
    }

    return quote;
  });
}

/**
 * Creates one OPEN service per unique serviceTypeId found in the quote's items.
 * Falls back to a single service with no serviceType if the quote has no typed items.
 * Links the quote to the first created service via quote.serviceId.
 * @param id - Quote ID
 * @param userId - ID of the user performing the action
 * @param companyId - Tenant isolation company ID
 * @returns Array of newly created services (or existing linked service wrapped in array)
 * @throws {AppError} If quote is not found (404)
 */
export async function convertQuoteToService(id: string, userId?: string, companyId?: string | null) {
  const tenantFilter = companyId ? { companyId } : {};
  const quote = await prisma.quote.findFirst({
    where: { id, deletedAt: null, ...tenantFilter },
    include: {
      quoteShips: { take: 1 },
      items: { select: { serviceTypeId: true } },
    },
  });
  if (!quote) throw new AppError('Quote not found', 404);

  if (quote.serviceId) {
    const existing = await prisma.service.findFirst({ where: { id: quote.serviceId } });
    if (existing) return [existing];
  }

  const uniqueTypeIds = [...new Set(
    quote.items.map((i) => i.serviceTypeId).filter((v): v is number => v != null)
  )];

  const typeIdsToCreate = uniqueTypeIds.length > 0 ? uniqueTypeIds : [null];
  const shipId = quote.quoteShips[0]?.shipId ?? null;
  const quoteLabel = quote.quoteNumber ?? quote.id.slice(-6);

  const services = await prisma.$transaction(
    typeIdsToCreate.map((serviceTypeId) =>
      prisma.service.create({
        data: {
          companyId: quote.companyId,
          customerId: quote.customerId,
          shipId,
          serviceTypeId,
          status: 'OPEN',
          priority: 'MEDIUM',
          createdById: userId,
          assignedUserId: userId ?? null,
          logs: {
            create: {
              userId,
              action: 'CREATED',
              note: `Teklif #${quoteLabel} üzerinden oluşturuldu`,
            },
          },
        },
      })
    )
  );

  await prisma.quote.update({ where: { id }, data: { serviceId: services[0].id } });

  return services;
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
