import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/error.middleware';
import { InvoiceStatus } from '@prisma/client';

export interface InvoiceQuery {
  page: number;
  pageSize: number;
  search?: string;
  customerId?: string;
  serviceId?: string;
  status?: InvoiceStatus;
  currency?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

const SORT_WHITELIST = ['invoiceDate', 'dueDate', 'amount', 'createdAt', 'status'];

export async function getInvoices(q: InvoiceQuery, companyId: string | null) {
  const { page, pageSize, search, customerId, serviceId, status, currency, dateFrom, dateTo, sortOrder = 'desc' } = q;
  const sortBy = SORT_WHITELIST.includes(q.sortBy ?? '') ? q.sortBy! : 'invoiceDate';

  const tenantFilter = companyId ? { companyId } : {};

  const where = {
    deletedAt: null,
    ...tenantFilter,
    ...(search
      ? {
          OR: [
            { refNo: { contains: search, mode: 'insensitive' as const } },
            { customer: { name: { contains: search, mode: 'insensitive' as const } } },
            { customer: { shortCode: { contains: search, mode: 'insensitive' as const } } },
          ],
        }
      : {}),
    ...(customerId ? { customerId } : {}),
    ...(serviceId ? { serviceId } : {}),
    ...(status ? { status } : {}),
    ...(currency ? { currency } : {}),
    ...((dateFrom || dateTo)
      ? {
          invoiceDate: {
            ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
            ...(dateTo ? { lte: new Date(dateTo) } : {}),
          },
        }
      : {}),
  };

  const [data, total] = await Promise.all([
    prisma.invoice.findMany({
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
        _count: { select: { payments: true } },
      },
    }),
    prisma.invoice.count({ where }),
  ]);

  return { data, total, page, pageSize };
}

export interface InvoiceItemInput {
  productId?: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  currency: string;
  total: number;
  sortOrder?: number;
}

export async function getInvoiceById(id: string, companyId: string | null) {
  const tenantFilter = companyId ? { companyId } : {};
  const inv = await prisma.invoice.findFirst({
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
      quote: { select: { id: true, quoteNumber: true } },
      createdBy: { select: { id: true, name: true } },
      payments: { orderBy: { paymentDate: 'asc' } },
      items: { include: { product: true }, orderBy: { sortOrder: 'asc' } },
    },
  });
  if (!inv) throw new AppError('Invoice not found', 404);
  return inv;
}

export async function createInvoice(data: {
  customerId: string;
  serviceId?: string;
  quoteId?: string;
  refNo?: string;
  amount: number;
  currency?: string;
  status?: InvoiceStatus;
  isCombined?: boolean;
  invoiceDate: string;
  dueDate?: string;
  sentAt?: string;
  notes?: string;
  createdById?: string;
  items?: InvoiceItemInput[];
}, companyId?: string) {
  if (!companyId) throw new AppError('Tenant bilgisi eksik', 400);
  const { invoiceDate, dueDate, sentAt, items, ...rest } = data;

  return prisma.$transaction(async (tx) => {
    const inv = await tx.invoice.create({
      data: {
        ...rest,
        companyId,
        invoiceDate: new Date(invoiceDate),
        ...(dueDate ? { dueDate: new Date(dueDate) } : {}),
        ...(sentAt ? { sentAt: new Date(sentAt) } : {}),
      },
    });

    if (items && items.length > 0) {
      await tx.invoiceItem.createMany({
        data: items.map((item, i) => ({
          id: require('crypto').randomUUID(),
          invoiceId: inv.id,
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

    return inv;
  });
}

export async function updateInvoice(
  id: string,
  data: {
    customerId?: string;
    serviceId?: string | null;
    quoteId?: string | null;
    refNo?: string;
    amount?: number;
    currency?: string;
    status?: InvoiceStatus;
    isCombined?: boolean;
    invoiceDate?: string;
    dueDate?: string | null;
    sentAt?: string | null;
    notes?: string;
    items?: InvoiceItemInput[];
  },
  userId?: string,
  companyId?: string | null
) {
  const tenantFilter = companyId ? { companyId } : {};
  const existing = await prisma.invoice.findFirst({ where: { id, deletedAt: null, ...tenantFilter } });
  if (!existing) throw new AppError('Invoice not found', 404);

  const { invoiceDate, dueDate, sentAt, items, ...rest } = data;

  return prisma.$transaction(async (tx) => {
    const inv = await tx.invoice.update({
      where: { id },
      data: {
        ...rest,
        updatedById: userId,
        ...(invoiceDate ? { invoiceDate: new Date(invoiceDate) } : {}),
        ...(dueDate !== undefined ? { dueDate: dueDate ? new Date(dueDate) : null } : {}),
        ...(sentAt !== undefined ? { sentAt: sentAt ? new Date(sentAt) : null } : {}),
      },
    });

    if (items !== undefined) {
      await tx.invoiceItem.deleteMany({ where: { invoiceId: id } });
      if (items.length > 0) {
        await tx.invoiceItem.createMany({
          data: items.map((item, i) => ({
            id: require('crypto').randomUUID(),
            invoiceId: id,
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

    return inv;
  });
}

export async function deleteInvoice(id: string, userId?: string, companyId?: string | null) {
  const tenantFilter = companyId ? { companyId } : {};
  const inv = await prisma.invoice.findFirst({ where: { id, deletedAt: null, ...tenantFilter } });
  if (!inv) throw new AppError('Invoice not found', 404);
  return prisma.invoice.update({
    where: { id },
    data: { deletedAt: new Date(), deletedById: userId },
  });
}

export async function addPayment(
  invoiceId: string,
  data: {
    amount: number;
    currency?: string;
    paymentDate: string;
    method?: string;
    reference?: string;
    notes?: string;
  }
) {
  const inv = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { payments: true },
  });
  if (!inv) throw new AppError('Invoice not found', 404);

  const { paymentDate, ...rest } = data;
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.create({
      data: {
        invoiceId,
        ...rest,
        currency: rest.currency ?? inv.currency,
        paymentDate: new Date(paymentDate),
      },
    });

    const allPayments = [...inv.payments, { amount: data.amount }];
    const totalPaid = allPayments.reduce((sum, p) => sum + p.amount, 0);
    let newStatus: InvoiceStatus = inv.status;
    if (totalPaid >= inv.amount) newStatus = 'PAID';
    else if (totalPaid > 0) newStatus = 'PARTIALLY_PAID';

    if (newStatus !== inv.status) {
      await tx.invoice.update({ where: { id: invoiceId }, data: { status: newStatus } });
    }

    return payment;
  });
}

export async function deletePayment(paymentId: string) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      invoice: { include: { payments: true } },
    },
  });
  if (!payment) throw new AppError('Payment not found', 404);

  return prisma.$transaction(async (tx) => {
    await tx.payment.delete({ where: { id: paymentId } });

    const inv = payment.invoice;
    const remainingPayments = inv.payments.filter((p) => p.id !== paymentId);
    const totalPaid = remainingPayments.reduce((sum, p) => sum + p.amount, 0);

    let newStatus: InvoiceStatus;
    if (totalPaid >= inv.amount) newStatus = 'PAID';
    else if (totalPaid > 0) newStatus = 'PARTIALLY_PAID';
    else newStatus = 'SENT';

    if (newStatus !== inv.status) {
      await tx.invoice.update({ where: { id: inv.id }, data: { status: newStatus } });
    }
  });
}

// ─── Convert quote to draft invoice ─────────────────────────────────────────

export async function createInvoiceFromQuote(
  quoteId: string,
  companyId: string | null,
  userId?: string,
) {
  if (!companyId) throw new AppError('Tenant bilgisi eksik', 400);

  const quote = await prisma.quote.findFirst({
    where: { id: quoteId, companyId, deletedAt: null },
    include: {
      items: { orderBy: { sortOrder: 'asc' } },
    },
  });
  if (!quote) throw new AppError('Teklif bulunamadı', 404);

  // Determine invoice currency: prefer EUR → USD → TRY from items, else quote currency or EUR
  const itemCurrencies = [...new Set(quote.items.map((i) => i.currency))];
  const invoiceCurrency = itemCurrencies.length === 1
    ? itemCurrencies[0]
    : (quote.priceEur != null ? 'EUR' : quote.priceUsd != null ? 'USD' : quote.priceTry != null ? 'TRY' : 'EUR');

  // Amount = sum of items matching invoice currency (or 0 if mixed / no items)
  const amount = quote.items
    .filter((i) => i.currency === invoiceCurrency)
    .reduce((sum, i) => sum + Number(i.total), 0);

  return prisma.$transaction(async (tx) => {
    const inv = await tx.invoice.create({
      data: {
        companyId,
        customerId: quote.customerId,
        serviceId: quote.serviceId ?? undefined,
        quoteId: quote.id,
        createdById: userId,
        amount,
        currency: invoiceCurrency,
        status: 'DRAFT',
        isCombined: quote.combinedInvoice,
        invoiceDate: new Date(),
        notes: quote.notes ?? undefined,
      },
    });

    if (quote.items.length > 0) {
      await tx.invoiceItem.createMany({
        data: quote.items.map((item, i) => ({
          id: require('crypto').randomUUID(),
          invoiceId: inv.id,
          productId: item.productId ?? null,
          description: item.description,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          currency: item.currency,
          total: Number(item.total),
          sortOrder: item.sortOrder ?? i,
        })),
      });
    }

    return inv;
  });
}
