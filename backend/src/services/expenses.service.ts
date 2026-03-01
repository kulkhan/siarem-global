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

/**
 * Returns a paginated, filterable list of expenses/income with aggregated totals.
 * @param q - Query options including type, category, currency, date range, search, sort
 * @param companyId - Tenant isolation company ID; null for SUPER_ADMIN (all tenants)
 * @returns Paginated expense list with incomeTotal, expenseTotal, and net values
 */
export async function getExpenses(q: ExpenseQuery, companyId: string | null) {
  const page = q.page ?? 1;
  const pageSize = q.pageSize ?? 20;
  const skip = (page - 1) * pageSize;
  const sortBy = q.sortBy ?? 'date';
  const sortOrder = q.sortOrder ?? 'desc';

  const tenantFilter = companyId ? { companyId } : {};
  const where: Record<string, unknown> = { deletedAt: null, ...tenantFilter };
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

/**
 * Returns a single expense record by ID with related customer, ship, service, and creator.
 * @param id - Expense ID
 * @param companyId - Tenant isolation company ID; null for SUPER_ADMIN
 * @returns Expense record with includes
 * @throws {Error} If expense is not found (Prisma findFirstOrThrow)
 */
export async function getExpenseById(id: string, companyId: string | null) {
  const tenantFilter = companyId ? { companyId } : {};
  return prisma.expense.findFirstOrThrow({ where: { id, deletedAt: null, ...tenantFilter }, include });
}

/**
 * Creates an expense or income record for a tenant.
 * @param data - Expense details (type, category, description, amount, currency, date, optional links)
 * @param companyId - Tenant isolation company ID
 * @returns Created expense record with includes
 */
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
}, companyId?: string) {
  return prisma.expense.create({
    data: {
      companyId: companyId!,
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

/**
 * Updates an expense record after verifying tenant ownership.
 * @param id - Expense ID
 * @param data - Partial update data
 * @param userId - ID of the updating user
 * @param companyId - Tenant isolation company ID
 * @returns Updated expense record with includes
 * @throws {Error} If expense is not found (Prisma findFirstOrThrow)
 */
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
  userId?: string,
  companyId?: string | null
) {
  const tenantFilter = companyId ? { companyId } : {};
  await prisma.expense.findFirstOrThrow({ where: { id, deletedAt: null, ...tenantFilter } });
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

/**
 * Soft-deletes an expense by setting deletedAt timestamp.
 * @param id - Expense ID
 * @param userId - ID of the user performing the deletion
 * @param companyId - Tenant isolation company ID
 * @returns Updated expense record with deletedAt set
 * @throws {Error} If expense is not found (Prisma findFirstOrThrow)
 */
export async function deleteExpense(id: string, userId?: string, companyId?: string | null) {
  const tenantFilter = companyId ? { companyId } : {};
  await prisma.expense.findFirstOrThrow({ where: { id, deletedAt: null, ...tenantFilter } });
  return prisma.expense.update({
    where: { id },
    data: { deletedAt: new Date(), deletedById: userId },
  });
}

/**
 * Returns grouped expense/income totals by type and currency for a resource.
 * @param params - Filter options (customerId, shipId, serviceId, companyId)
 * @returns Array of { type, currency, _sum.amount, _count.id } grouped records
 */
export async function getExpenseSummary(params: {
  customerId?: string;
  shipId?: string;
  serviceId?: string;
  companyId?: string | null;
}) {
  const tenantFilter = params.companyId ? { companyId: params.companyId } : {};
  const where: Record<string, unknown> = { deletedAt: null, ...tenantFilter };
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
