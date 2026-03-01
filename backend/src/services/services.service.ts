import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/error.middleware';
import { ServiceStatus, Priority } from '@prisma/client';

export interface ServiceQuery {
  page: number;
  pageSize: number;
  search?: string;
  customerId?: string;
  shipId?: string;
  serviceTypeId?: number;
  status?: ServiceStatus;
  priority?: Priority;
  assignedUserId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

const SORT_WHITELIST = ['createdAt', 'updatedAt', 'status', 'priority', 'startDate', 'completedAt'];

/**
 * Returns a paginated, filterable list of services with customer, ship, and type details.
 * @param q - Query options including search, customerId, shipId, status, priority, sort
 * @param companyId - Tenant isolation company ID; null for SUPER_ADMIN (all tenants)
 * @returns Paginated service list
 */
export async function getServices(q: ServiceQuery, companyId: string | null) {
  const { page, pageSize, search, customerId, shipId, serviceTypeId, status, priority, assignedUserId, sortOrder = 'desc' } = q;
  const sortBy = SORT_WHITELIST.includes(q.sortBy ?? '') ? q.sortBy! : 'createdAt';

  const tenantFilter = companyId ? { companyId } : {};

  const where = {
    deletedAt: null,
    ...tenantFilter,
    ...(search
      ? {
          OR: [
            { customer: { name: { contains: search, mode: 'insensitive' as const } } },
            { customer: { shortCode: { contains: search, mode: 'insensitive' as const } } },
            { ship: { name: { contains: search, mode: 'insensitive' as const } } },
            { ship: { imoNumber: { contains: search, mode: 'insensitive' as const } } },
          ],
        }
      : {}),
    ...(customerId ? { customerId } : {}),
    ...(shipId ? { shipId } : {}),
    ...(serviceTypeId ? { serviceTypeId } : {}),
    ...(status ? { status } : {}),
    ...(priority ? { priority } : {}),
    ...(assignedUserId ? { assignedUserId } : {}),
  };

  const orderBy = { [sortBy]: sortOrder };

  const [data, total] = await Promise.all([
    prisma.service.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy,
      include: {
        customer: { select: { id: true, name: true, shortCode: true } },
        ship: { select: { id: true, name: true, imoNumber: true } },
        serviceType: { select: { id: true, nameEn: true, nameTr: true, code: true } },
        assignedUser: { select: { id: true, name: true } },
      },
    }),
    prisma.service.count({ where }),
  ]);

  return { data, total, page, pageSize };
}

/**
 * Returns a single service by ID with all related data including invoices and activity logs.
 * @param id - Service ID
 * @param companyId - Tenant isolation company ID; null for SUPER_ADMIN
 * @returns Service record with customer, ship, serviceType, invoices, logs (last 100)
 * @throws {AppError} If service is not found (404)
 */
export async function getServiceById(id: string, companyId: string | null) {
  const tenantFilter = companyId ? { companyId } : {};
  const s = await prisma.service.findFirst({
    where: { id, deletedAt: null, ...tenantFilter },
    include: {
      customer: { select: { id: true, name: true, shortCode: true } },
      ship: { select: { id: true, name: true, imoNumber: true } },
      serviceType: true,
      assignedUser: { select: { id: true, name: true } },
      invoices: {
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          refNo: true,
          amount: true,
          currency: true,
          status: true,
          sentAt: true,
          invoiceDate: true,
          isCombined: true,
        },
      },
      logs: {
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: {
          user: { select: { id: true, name: true } },
        },
      },
    },
  });
  if (!s) throw new AppError('Service not found', 404);
  return s;
}

/**
 * Creates a new service and appends a CREATED entry to the service log, in a transaction.
 * @param data - Service fields (customerId, serviceTypeId, status, priority, regulatory fields, etc.)
 * @param userId - ID of the creating user
 * @param companyId - Tenant isolation company ID
 * @returns Created service record
 * @throws {AppError} If tenant is missing (400)
 */
export async function createService(
  data: {
    customerId: string;
    shipId?: string;
    serviceTypeId?: number;
    assignedUserId?: string;
    status?: ServiceStatus;
    priority?: Priority;
    euMrvMpStatus?: string;
    ukMrvMpStatus?: string;
    fuelEuMpStatus?: string;
    imoDcsStatus?: string;
    euEtsStatus?: string;
    mohaStatus?: string;
    statusNote?: string;
    notes?: string;
    startDate?: string;
    invoiceReady?: boolean;
    invoiceReadyNote?: string;
  },
  userId?: string,
  companyId?: string
) {
  if (!companyId) throw new AppError('Tenant bilgisi eksik', 400);
  const { startDate, ...rest } = data;
  return prisma.$transaction(async (tx) => {
    const created = await tx.service.create({
      data: {
        ...rest,
        companyId,
        createdById: userId,
        ...(startDate ? { startDate: new Date(startDate) } : {}),
      },
    });
    await tx.serviceLog.create({
      data: {
        serviceId: created.id,
        userId: userId || null,
        action: 'CREATED',
        note: 'Hizmet oluşturuldu',
      },
    });
    return created;
  });
}

/**
 * Updates a service and appends change entries to the service log in a transaction.
 * Tracks changes to status, invoiceReady, assignedUserId, and priority.
 * @param id - Service ID
 * @param data - Partial service update data
 * @param userId - ID of the updating user
 * @param companyId - Tenant isolation company ID
 * @returns Updated service record
 * @throws {AppError} If service is not found (404)
 */
export async function updateService(
  id: string,
  data: {
    customerId?: string;
    shipId?: string;
    serviceTypeId?: number | null;
    assignedUserId?: string | null;
    status?: ServiceStatus;
    priority?: Priority;
    euMrvMpStatus?: string;
    ukMrvMpStatus?: string;
    fuelEuMpStatus?: string;
    imoDcsStatus?: string;
    euEtsStatus?: string;
    mohaStatus?: string;
    statusNote?: string;
    notes?: string;
    startDate?: string | null;
    completedAt?: string | null;
    invoiceReady?: boolean;
    invoiceReadyNote?: string;
  },
  userId?: string,
  companyId?: string | null
) {
  const tenantFilter = companyId ? { companyId } : {};
  const existing = await prisma.service.findFirst({ where: { id, deletedAt: null, ...tenantFilter } });
  if (!existing) throw new AppError('Service not found', 404);

  const { startDate, completedAt, ...rest } = data;

  type LogEntry = {
    serviceId: string;
    userId: string | null;
    action: string;
    field?: string;
    oldValue?: string | null;
    newValue?: string | null;
  };
  const logEntries: LogEntry[] = [];

  if (data.status !== undefined && data.status !== existing.status) {
    logEntries.push({ serviceId: id, userId: userId || null, action: 'STATUS_CHANGED', field: 'status', oldValue: existing.status, newValue: data.status });
  }
  if (data.invoiceReady !== undefined && data.invoiceReady !== existing.invoiceReady) {
    logEntries.push({ serviceId: id, userId: userId || null, action: 'BILLING_READY', field: 'invoiceReady', oldValue: String(existing.invoiceReady), newValue: String(data.invoiceReady) });
  }
  if (data.assignedUserId !== undefined && data.assignedUserId !== existing.assignedUserId) {
    logEntries.push({ serviceId: id, userId: userId || null, action: 'ASSIGNED', field: 'assignedUserId', oldValue: existing.assignedUserId || null, newValue: data.assignedUserId || null });
  }
  if (data.priority !== undefined && data.priority !== existing.priority) {
    logEntries.push({ serviceId: id, userId: userId || null, action: 'UPDATED', field: 'priority', oldValue: existing.priority, newValue: data.priority });
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.service.update({
      where: { id },
      data: {
        ...rest,
        updatedById: userId,
        ...(startDate !== undefined ? { startDate: startDate ? new Date(startDate) : null } : {}),
        ...(completedAt !== undefined ? { completedAt: completedAt ? new Date(completedAt) : null } : {}),
      },
    });
    if (logEntries.length > 0) {
      await tx.serviceLog.createMany({ data: logEntries });
    }
    return updated;
  });
}

/**
 * Soft-deletes a service by setting deletedAt timestamp.
 * @param id - Service ID
 * @param userId - ID of the user performing the deletion
 * @param companyId - Tenant isolation company ID
 * @returns Updated service record with deletedAt set
 * @throws {AppError} If service is not found (404)
 */
export async function deleteService(id: string, userId?: string, companyId?: string | null) {
  const tenantFilter = companyId ? { companyId } : {};
  const s = await prisma.service.findFirst({ where: { id, deletedAt: null, ...tenantFilter } });
  if (!s) throw new AppError('Service not found', 404);
  return prisma.service.update({
    where: { id },
    data: { deletedAt: new Date(), deletedById: userId },
  });
}

/**
 * Returns global service types merged with company-specific types.
 * @param companyId - Tenant isolation company ID; null returns only global types
 * @returns Array of ServiceType records ordered by nameEn
 */
export async function getServiceTypes(companyId: string | null) {
  // Return global types + company-specific types
  return prisma.serviceType.findMany({
    where: { OR: [{ companyId: null }, ...(companyId ? [{ companyId }] : [])] },
    orderBy: { nameEn: 'asc' },
  });
}
