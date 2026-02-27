import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/error.middleware';
import { ShipStatus } from '@prisma/client';

export interface ShipQuery {
  page: number;
  pageSize: number;
  search?: string;
  customerId?: string;
  shipTypeId?: number;
  status?: ShipStatus;
  flag?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

const SORT_WHITELIST = ['name', 'imoNumber', 'flag', 'status', 'builtYear', 'createdAt'];

export async function getShips(q: ShipQuery, companyId: string | null) {
  const { page, pageSize, search, customerId, shipTypeId, status, flag, sortOrder = 'asc' } = q;
  const sortBy = SORT_WHITELIST.includes(q.sortBy ?? '') ? q.sortBy! : 'name';

  const tenantFilter = companyId ? { companyId } : {};

  const where = {
    deletedAt: null,
    ...tenantFilter,
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { imoNumber: { contains: search, mode: 'insensitive' as const } },
            { customer: { name: { contains: search, mode: 'insensitive' as const } } },
          ],
        }
      : {}),
    ...(customerId ? { customerId } : {}),
    ...(shipTypeId ? { shipTypeId } : {}),
    ...(status ? { status } : {}),
    ...(flag ? { flag: { equals: flag, mode: 'insensitive' as const } } : {}),
  };

  const [data, total] = await Promise.all([
    prisma.ship.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { [sortBy]: sortOrder },
      include: {
        customer: { select: { id: true, name: true, shortCode: true } },
        shipType: { select: { id: true, name: true, ciiType: true } },
      },
    }),
    prisma.ship.count({ where }),
  ]);

  return { data, total, page, pageSize };
}

export async function getShipById(id: string, companyId: string | null) {
  const tenantFilter = companyId ? { companyId } : {};
  const s = await prisma.ship.findFirst({
    where: { id, deletedAt: null, ...tenantFilter },
    include: {
      customer: { select: { id: true, name: true, shortCode: true } },
      shipType: true,
      _count: { select: { services: true } },
    },
  });
  if (!s) throw new AppError('Ship not found', 404);
  return s;
}

export async function createShip(
  data: {
    customerId: string;
    name: string;
    imoNumber?: string;
    shipTypeId?: number;
    flag?: string;
    grossTonnage?: number;
    dwt?: number;
    netTonnage?: number;
    builtYear?: number;
    classificationSociety?: string;
    emissionVerifier?: string;
    itSystem?: string;
    adminAuthority?: string;
    isLargeVessel?: boolean;
    status?: ShipStatus;
    notes?: string;
  },
  userId?: string,
  companyId?: string
) {
  if (!companyId) throw new AppError('Tenant bilgisi eksik', 400);
  if (data.imoNumber) {
    const existing = await prisma.ship.findFirst({
      where: { imoNumber: data.imoNumber, companyId, deletedAt: null },
    });
    if (existing) throw new AppError('IMO numarası zaten kayıtlı', 400);
  }
  return prisma.ship.create({ data: { ...data, companyId, createdById: userId } });
}

export async function updateShip(
  id: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>,
  userId?: string,
  companyId?: string | null
) {
  const tenantFilter = companyId ? { companyId } : {};
  const s = await prisma.ship.findFirst({ where: { id, deletedAt: null, ...tenantFilter } });
  if (!s) throw new AppError('Ship not found', 404);
  if (data.imoNumber && data.imoNumber !== s.imoNumber) {
    const existing = await prisma.ship.findFirst({
      where: { imoNumber: data.imoNumber, companyId: s.companyId, NOT: { id } },
    });
    if (existing) throw new AppError('IMO numarası zaten kayıtlı', 400);
  }
  return prisma.ship.update({ where: { id }, data: { ...data, updatedById: userId } });
}

export async function deleteShip(id: string, userId?: string, companyId?: string | null) {
  const tenantFilter = companyId ? { companyId } : {};
  const svcCount = await prisma.service.count({ where: { shipId: id, deletedAt: null } });
  if (svcCount > 0)
    throw new AppError(`Bu gemiye ait ${svcCount} hizmet kaydı bulunuyor.`, 400);
  const s = await prisma.ship.findFirst({ where: { id, deletedAt: null, ...tenantFilter } });
  if (!s) throw new AppError('Ship not found', 404);
  return prisma.ship.update({
    where: { id },
    data: { deletedAt: new Date(), deletedById: userId },
  });
}

export async function getShipTypes(companyId: string | null) {
  // Return global types + company-specific types
  return prisma.shipType.findMany({
    where: { OR: [{ companyId: null }, ...(companyId ? [{ companyId }] : [])] },
    orderBy: { name: 'asc' },
  });
}

export async function getFlagOptions(companyId: string | null) {
  const tenantFilter = companyId ? { companyId } : {};
  const rows = await prisma.ship.findMany({
    where: { flag: { not: null }, deletedAt: null, ...tenantFilter },
    select: { flag: true },
    distinct: ['flag'],
    orderBy: { flag: 'asc' },
  });
  return rows.map((r) => r.flag).filter(Boolean) as string[];
}
