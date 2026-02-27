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

export async function getCustomers(q: CustomerQuery) {
  const { page, pageSize, search, country, isActive, sortOrder = 'asc' } = q;
  const sortBy = SORT_WHITELIST.includes(q.sortBy ?? '') ? q.sortBy! : 'name';

  const where = {
    deletedAt: null,
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

export async function getCustomerById(id: string) {
  const c = await prisma.customer.findFirst({
    where: { id, deletedAt: null },
    include: {
      _count: { select: { ships: true, services: true, invoices: true } },
      contacts: { where: { deletedAt: null }, orderBy: { isPrimary: 'desc' } },
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
    country?: string;
    taxNumber?: string;
    notes?: string;
  },
  userId?: string
) {
  const existing = await prisma.customer.findUnique({ where: { shortCode: data.shortCode } });
  if (existing) throw new AppError('Short code already in use', 400);
  return prisma.customer.create({ data: { ...data, createdById: userId } });
}

export async function updateCustomer(
  id: string,
  data: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    country?: string;
    taxNumber?: string;
    notes?: string;
    isActive?: boolean;
  },
  userId?: string
) {
  const c = await prisma.customer.findFirst({ where: { id, deletedAt: null } });
  if (!c) throw new AppError('Customer not found', 404);
  return prisma.customer.update({ where: { id }, data: { ...data, updatedById: userId } });
}

export async function deleteCustomer(id: string, userId?: string) {
  const shipCount = await prisma.ship.count({ where: { customerId: id, deletedAt: null } });
  if (shipCount > 0)
    throw new AppError(`Bu müşteriye ait ${shipCount} gemi bulunuyor. Önce gemileri silin.`, 400);
  const c = await prisma.customer.findFirst({ where: { id, deletedAt: null } });
  if (!c) throw new AppError('Customer not found', 404);
  return prisma.customer.update({
    where: { id },
    data: { deletedAt: new Date(), deletedById: userId },
  });
}

export async function getCountryOptions() {
  const rows = await prisma.customer.findMany({
    where: { country: { not: null }, deletedAt: null },
    select: { country: true },
    distinct: ['country'],
    orderBy: { country: 'asc' },
  });
  return rows.map((r) => r.country).filter(Boolean) as string[];
}
