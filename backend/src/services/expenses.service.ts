import { prisma } from '../lib/prisma';

export const EXPENSE_CATEGORIES = [
  'Personnel', 'Office', 'Travel', 'Service Cost',
  'Equipment', 'Software', 'Marketing', 'Tax', 'Other',
];

interface ExpenseQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  type?: string;
  category?: string;
  currency?: string;
  customerId?: string;
  shipId?: string;
  serviceId?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

const include = {
  customer: { select: { id: true, name: true, shortCode: true } },
  ship: { select: { id: true, name: true } },
  service: { select: { id: true, serviceType: { select: { nameTr: true, nameEn: true } } } },
  createdBy: { select: { id: true, name: true } },
};

export async function getExpenses(q: ExpenseQuery) {
  const page = q.page ?? 1;
  const pageSize = q.pageSize ?? 20;
  const skip = (page - 1) * pageSize;
  const sortBy = q.sortBy ?? 'date';
  const sortOrder = q.sortOrder ?? 'desc';

  const where: Record<string, unknown> = { deletedAt: null };
  if (q.type) where.type = q.type;
  if (q.category) where.category = q.category;
  if (q.currency) where.currency = q.currency;
  if (q.customerId) where.customerId = q.customerId;
  if (q.shipId) where.shipId = q.shipId;
  if (q.serviceId) where.serviceId = q.serviceId;

  if (q.search) {
    where.OR = [
      { description: { contains: q.search, mode: 'insensitive' } },
      { customer: { name: { contains: q.search, mode: 'insensitive' } } },
      { notes: { contains: q.search, mode: 'insensitive' } },
    ];
  }

  if (q.dateFrom || q.dateTo) {
    const dateFilter: Record<string, Date> = {};
    if (q.dateFrom) dateFilter.gte = new Date(q.dateFrom);
    if (q.dateTo) dateFilter.lte = new Date(q.dateTo + 'T23:59:59');
    where.date = dateFilter;
  }

  const [data, total, aggregates] = await Promise.all([
    prisma.expense.findMany({ where, include, skip, take: pageSize, orderBy: { [sortBy]: sortOrder } }),
    prisma.expense.count({ where }),
    prisma.expense.groupBy({
      by: ['type'],
      where,
      _sum: { amount: true },
    }),
  ]);

  const incomeTotal = aggregates.find((a) => a.type === 'INCOME')?._sum.amount ?? 0;
  const expenseTotal = aggregates.find((a) => a.type === 'EXPENSE')?._sum.amount ?? 0;

  return { data, total, page, pageSize, incomeTotal, expenseTotal, net: incomeTotal - expenseTotal };
}

export async function getExpenseById(id: string) {
  return prisma.expense.findFirstOrThrow({ where: { id, deletedAt: null }, include });
}

export async function createExpense(data: {
  type: string;
  category?: string;
  description: string;
  amount: number;
  currency?: string;
  date: string;
  customerId?: string;
  shipId?: string;
  serviceId?: string;
  invoiceId?: string;
  notes?: string;
  createdById?: string;
}) {
  return prisma.expense.create({
    data: {
      type: data.type,
      category: data.category || undefined,
      description: data.description,
      amount: data.amount,
      currency: data.currency ?? 'TRY',
      date: new Date(data.date),
      customerId: data.customerId || undefined,
      shipId: data.shipId || undefined,
      serviceId: data.serviceId || undefined,
      invoiceId: data.invoiceId || undefined,
      notes: data.notes || undefined,
      createdById: data.createdById || undefined,
    },
    include,
  });
}

export async function updateExpense(
  id: string,
  data: Partial<{
    type: string;
    category: string | null;
    description: string;
    amount: number;
    currency: string;
    date: string;
    customerId: string | null;
    shipId: string | null;
    serviceId: string | null;
    invoiceId: string | null;
    notes: string | null;
  }>,
  userId?: string
) {
  return prisma.expense.update({
    where: { id },
    data: {
      ...data,
      updatedById: userId,
      date: data.date ? new Date(data.date) : undefined,
    },
    include,
  });
}

export async function deleteExpense(id: string, userId?: string) {
  return prisma.expense.update({
    where: { id },
    data: { deletedAt: new Date(), deletedById: userId },
  });
}

export async function getExpenseSummary(params: { customerId?: string; shipId?: string; serviceId?: string }) {
  const where: Record<string, unknown> = { deletedAt: null };
  if (params.customerId) where.customerId = params.customerId;
  if (params.shipId) where.shipId = params.shipId;
  if (params.serviceId) where.serviceId = params.serviceId;

  const result = await prisma.expense.groupBy({
    by: ['type', 'currency'],
    where,
    _sum: { amount: true },
    _count: { id: true },
  });
  return result;
}
