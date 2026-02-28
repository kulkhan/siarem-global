import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/error.middleware';

export interface CustomerQuery {
  page: number;
  pageSize: number;
  search?: string;
  country?: string;
  isActive?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

const SORT_WHITELIST = ['name', 'shortCode', 'country', 'createdAt', 'shipCount'];

export async function getCustomers(q: CustomerQuery, companyId: string | null) {
  const { page, pageSize, search, country, isActive, sortOrder = 'asc' } = q;
  const sortBy = SORT_WHITELIST.includes(q.sortBy ?? '') ? q.sortBy! : 'name';

  const tenantFilter = companyId ? { companyId } : {};

  const where = {
    deletedAt: null,
    ...tenantFilter,
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { shortCode: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
    ...(country ? { country: { equals: country, mode: 'insensitive' as const } } : {}),
    ...(isActive !== undefined ? { isActive } : {}),
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orderBy: any =
    sortBy === 'shipCount'
      ? { ships: { _count: sortOrder } }
      : { [sortBy]: sortOrder };

  const [data, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy,
      include: { _count: { select: { ships: true } } },
    }),
    prisma.customer.count({ where }),
  ]);

  return { data, total, page, pageSize };
}

export async function getCustomerById(id: string, companyId: string | null) {
  const tenantFilter = companyId ? { companyId } : {};
  const c = await prisma.customer.findFirst({
    where: { id, deletedAt: null, ...tenantFilter },
    include: {
      _count: { select: { ships: true, services: true, invoices: true } },
      contacts: { where: { deletedAt: null }, orderBy: { isPrimary: 'desc' } },
      bankAccounts: { orderBy: { sortOrder: 'asc' } },
      assignees: {
        include: { user: { select: { id: true, name: true, email: true, role: true } } },
        orderBy: { assignedAt: 'asc' },
      },
    },
  });
  if (!c) throw new AppError('Customer not found', 404);
  return c;
}

export async function createCustomer(
  data: {
    shortCode: string;
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    country?: string;
    taxNumber?: string;
    notes?: string;
  },
  userId?: string,
  companyId?: string
) {
  if (!companyId) throw new AppError('Tenant bilgisi eksik', 400);
  const existing = await prisma.customer.findFirst({
    where: { shortCode: data.shortCode, companyId, deletedAt: null },
  });
  if (existing) throw new AppError('Short code already in use', 400);
  return prisma.customer.create({ data: { ...data, companyId, createdById: userId } });
}

export async function updateCustomer(
  id: string,
  data: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    country?: string;
    taxNumber?: string;
    notes?: string;
    isActive?: boolean;
  },
  userId?: string,
  companyId?: string | null
) {
  const tenantFilter = companyId ? { companyId } : {};
  const c = await prisma.customer.findFirst({ where: { id, deletedAt: null, ...tenantFilter } });
  if (!c) throw new AppError('Customer not found', 404);
  return prisma.customer.update({ where: { id }, data: { ...data, updatedById: userId } });
}

export async function deleteCustomer(id: string, userId?: string, companyId?: string | null) {
  const tenantFilter = companyId ? { companyId } : {};
  const shipCount = await prisma.ship.count({ where: { customerId: id, deletedAt: null } });
  if (shipCount > 0)
    throw new AppError(`Bu müşteriye ait ${shipCount} gemi bulunuyor. Önce gemileri silin.`, 400);
  const c = await prisma.customer.findFirst({ where: { id, deletedAt: null, ...tenantFilter } });
  if (!c) throw new AppError('Customer not found', 404);
  return prisma.customer.update({
    where: { id },
    data: { deletedAt: new Date(), deletedById: userId },
  });
}

export async function getCountryOptions(companyId: string | null) {
  const tenantFilter = companyId ? { companyId } : {};
  const rows = await prisma.customer.findMany({
    where: { country: { not: null }, deletedAt: null, ...tenantFilter },
    select: { country: true },
    distinct: ['country'],
    orderBy: { country: 'asc' },
  });
  return rows.map((r) => r.country).filter(Boolean) as string[];
}

// ── Bank Accounts ─────────────────────────────────────────────────────────────

export async function getBankAccounts(customerId: string, companyId: string | null) {
  const tenantFilter = companyId ? { companyId } : {};
  return prisma.customerBankAccount.findMany({
    where: { customerId, ...tenantFilter },
    orderBy: { sortOrder: 'asc' },
  });
}

export async function createBankAccount(
  customerId: string,
  data: { bankName: string; iban?: string; accountNo?: string; currency?: string; notes?: string },
  companyId: string
) {
  const count = await prisma.customerBankAccount.count({ where: { customerId } });
  return prisma.customerBankAccount.create({
    data: { ...data, customerId, companyId, sortOrder: count },
  });
}

export async function updateBankAccount(
  id: string,
  data: { bankName?: string; iban?: string; accountNo?: string; currency?: string; notes?: string },
  companyId: string | null
) {
  const tenantFilter = companyId ? { companyId } : {};
  const existing = await prisma.customerBankAccount.findFirst({ where: { id, ...tenantFilter } });
  if (!existing) throw new AppError('Bank account not found', 404);
  return prisma.customerBankAccount.update({ where: { id }, data });
}

export async function deleteBankAccount(id: string, companyId: string | null) {
  const tenantFilter = companyId ? { companyId } : {};
  const existing = await prisma.customerBankAccount.findFirst({ where: { id, ...tenantFilter } });
  if (!existing) throw new AppError('Bank account not found', 404);
  return prisma.customerBankAccount.delete({ where: { id } });
}
