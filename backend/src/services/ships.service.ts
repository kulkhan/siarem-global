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

/**
 * Returns a paginated, filterable list of ships with customer and ship type details.
 * @param q - Query options including search, customerId, shipTypeId, status, flag, sort
 * @param companyId - Tenant isolation company ID; null for SUPER_ADMIN (all tenants)
 * @returns Paginated ship list
 */
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

/**
 * Returns a single ship by ID with customer, ship type, and service count.
 * @param id - Ship ID
 * @param companyId - Tenant isolation company ID; null for SUPER_ADMIN
 * @returns Ship record with includes
 * @throws {AppError} If ship is not found (404)
 */
export async function getShipById(id: string, companyId: string | null) {
  const tenantFilter = companyId ? { companyId } : {};
  const s = await prisma.ship.findFirst({
    where: { id, deletedAt: null, ...tenantFilter },
    include: {
      customer: { select: { id: true, name: true, shortCode: true } },
      shipType: true,
      _count: { select: { services: true } },
      shipLogs: {
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: { user: { select: { id: true, name: true } } },
      },
      billingEntities: { orderBy: { isDefault: 'desc' } },
    },
  });
  if (!s) throw new AppError('Ship not found', 404);
  return s;
}

/**
 * Creates a new ship after verifying IMO number uniqueness within the tenant.
 * @param data - Ship fields (customerId, name, imoNumber, shipTypeId, flag, tonnage, etc.)
 * @param userId - ID of the creating user
 * @param companyId - Tenant isolation company ID
 * @returns Created ship record
 * @throws {AppError} If tenant is missing (400) or IMO number already exists (400)
 */
export type ShipData = {
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
  // extended fields
  callSign?: string;
  homePort?: string;
  iceClass?: string;
  eexi?: number;
  owner?: string;
  technicalManager?: string;
  customerRelationType?: string;
  customerSince?: string;
  // compliance
  euMrvMpStatus?: string;
  ukMrvMpStatus?: string;
  fuelEuMpStatus?: string;
  imoDcsStatus?: string;
  euEtsStatus?: string;
  seempPart2?: string;
  seempPart3?: string;
};

export async function createShip(data: ShipData, userId?: string, companyId?: string) {
  if (!companyId) throw new AppError('Tenant bilgisi eksik', 400);
  if (data.imoNumber) {
    const existing = await prisma.ship.findFirst({
      where: { imoNumber: data.imoNumber, companyId, deletedAt: null },
    });
    if (existing) throw new AppError('IMO numarası zaten kayıtlı', 400);
  }
  const ship = await prisma.ship.create({ data: { ...data, companyId, createdById: userId } });
  await prisma.shipLog.create({
    data: { shipId: ship.id, userId, action: 'CREATED', note: 'Gemi kaydı oluşturuldu' },
  });
  return ship;
}

/**
 * Updates a ship's fields after verifying tenant ownership and IMO number uniqueness on change.
 * @param id - Ship ID
 * @param data - Partial update data (accepts any fields)
 * @param userId - ID of the updating user
 * @param companyId - Tenant isolation company ID
 * @returns Updated ship record
 * @throws {AppError} If ship is not found (404) or new IMO number already exists (400)
 */
const TRACKED_SHIP_FIELDS = [
  'owner', 'technicalManager', 'flag', 'classificationSociety',
  'dwt', 'grossTonnage', 'status', 'customerRelationType',
];

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const logEntries: any[] = [];
  for (const field of TRACKED_SHIP_FIELDS) {
    if (field in data && String(data[field] ?? '') !== String((s as any)[field] ?? '')) {
      logEntries.push({
        shipId: id, userId: userId ?? null, action: 'UPDATED',
        field, oldValue: String((s as any)[field] ?? ''), newValue: String(data[field] ?? ''),
      });
    }
  }
  const updated = await prisma.ship.update({ where: { id }, data: { ...data, updatedById: userId } });
  if (logEntries.length > 0) {
    await prisma.shipLog.createMany({ data: logEntries });
  }
  return updated;
}

/**
 * Soft-deletes a ship, blocking if it has active service records.
 * @param id - Ship ID
 * @param userId - ID of the user performing the deletion
 * @param companyId - Tenant isolation company ID
 * @returns Updated ship record with deletedAt set
 * @throws {AppError} If ship has service records (400) or is not found (404)
 */
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

/**
 * Returns global ship types merged with company-specific ship types.
 * @param companyId - Tenant isolation company ID; null returns only global types
 * @returns Array of ShipType records ordered by name
 */
export async function getShipTypes(companyId: string | null) {
  // Return global types + company-specific types
  return prisma.shipType.findMany({
    where: { OR: [{ companyId: null }, ...(companyId ? [{ companyId }] : [])] },
    orderBy: { name: 'asc' },
  });
}

/**
 * Returns a distinct list of flag values from active ships for filter dropdowns.
 * @param companyId - Tenant isolation company ID; null for SUPER_ADMIN
 * @returns Sorted array of flag strings
 */
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

// ── Ship Billing Entities ────────────────────────────────────────────────────

export async function getBillingEntities(shipId: string, companyId: string | null) {
  const tenantFilter = companyId ? { companyId } : {};
  return prisma.shipBillingEntity.findMany({
    where: { shipId, ...tenantFilter },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
  });
}

export async function createBillingEntity(
  shipId: string,
  data: {
    entityName: string;
    entityAddress?: string;
    entityTaxNo?: string;
    entityCountry?: string;
    entityEmail?: string;
    isDefault?: boolean;
    notes?: string;
  },
  companyId: string
) {
  const ship = await prisma.ship.findFirst({ where: { id: shipId, companyId, deletedAt: null } });
  if (!ship) throw new AppError('Ship not found', 404);
  if (data.isDefault) {
    await prisma.shipBillingEntity.updateMany({ where: { shipId, companyId }, data: { isDefault: false } });
  }
  return prisma.shipBillingEntity.create({ data: { ...data, shipId, companyId } });
}

export async function updateBillingEntity(
  id: string,
  data: {
    entityName?: string;
    entityAddress?: string;
    entityTaxNo?: string;
    entityCountry?: string;
    entityEmail?: string;
    isDefault?: boolean;
    notes?: string;
  },
  companyId: string | null
) {
  const tenantFilter = companyId ? { companyId } : {};
  const existing = await prisma.shipBillingEntity.findFirst({ where: { id, ...tenantFilter } });
  if (!existing) throw new AppError('Billing entity not found', 404);
  if (data.isDefault) {
    await prisma.shipBillingEntity.updateMany({
      where: { shipId: existing.shipId, companyId: existing.companyId },
      data: { isDefault: false },
    });
  }
  return prisma.shipBillingEntity.update({ where: { id }, data });
}

export async function deleteBillingEntity(id: string, companyId: string | null) {
  const tenantFilter = companyId ? { companyId } : {};
  const existing = await prisma.shipBillingEntity.findFirst({ where: { id, ...tenantFilter } });
  if (!existing) throw new AppError('Billing entity not found', 404);
  return prisma.shipBillingEntity.delete({ where: { id } });
}
