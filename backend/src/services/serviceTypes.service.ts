import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/error.middleware';

/**
 * Returns global service types and company-specific types merged together.
 * @param companyId - Tenant isolation company ID; null returns only global types
 * @returns Array of ServiceType records ordered by companyId then nameEn
 */
export async function getServiceTypes(companyId: string | null) {
  return prisma.serviceType.findMany({
    where: { OR: [{ companyId: null }, ...(companyId ? [{ companyId }] : [])] },
    orderBy: [{ companyId: 'asc' }, { nameEn: 'asc' }],
  });
}

/**
 * Creates a service type; SUPER_ADMIN can create global types (companyId=null).
 * @param data - Service type fields including optional isGlobal flag
 * @param companyId - Tenant isolation company ID; null for SUPER_ADMIN
 * @param isSuperAdmin - Whether the caller is SUPER_ADMIN
 * @returns Created ServiceType record
 */
export async function createServiceType(
  data: { nameEn: string; nameTr: string; code: string; category?: string; description?: string; isGlobal?: boolean },
  companyId: string | null,
  isSuperAdmin: boolean
) {
  const targetCompanyId = isSuperAdmin && data.isGlobal ? null : companyId;
  return prisma.serviceType.create({
    data: {
      nameEn: data.nameEn,
      nameTr: data.nameTr,
      code: data.code,
      category: data.category ?? null,
      description: data.description ?? null,
      companyId: targetCompanyId,
    },
  });
}

/**
 * Updates a service type; global types can only be edited by SUPER_ADMIN.
 * @param id - ServiceType integer ID
 * @param data - Partial update data
 * @param companyId - Tenant isolation company ID; null for SUPER_ADMIN
 * @param isSuperAdmin - Whether the caller is SUPER_ADMIN
 * @returns Updated ServiceType record
 * @throws {AppError} If not found (404), or insufficient permissions (403)
 */
export async function updateServiceType(
  id: number,
  data: { nameEn?: string; nameTr?: string; code?: string; category?: string; description?: string },
  companyId: string | null,
  isSuperAdmin: boolean
) {
  const existing = await prisma.serviceType.findUnique({ where: { id } });
  if (!existing) throw new AppError('Servis tipi bulunamadı', 404);

  // Global type: only SUPER_ADMIN can edit
  if (existing.companyId === null && !isSuperAdmin) {
    throw new AppError('Global servis tiplerini yalnızca SUPER_ADMIN düzenleyebilir', 403);
  }
  // Tenant type: must belong to caller's company
  if (existing.companyId !== null && existing.companyId !== companyId && !isSuperAdmin) {
    throw new AppError('Bu servis tipi size ait değil', 403);
  }

  return prisma.serviceType.update({
    where: { id },
    data: {
      ...(data.nameEn !== undefined && { nameEn: data.nameEn }),
      ...(data.nameTr !== undefined && { nameTr: data.nameTr }),
      ...(data.code !== undefined && { code: data.code }),
      ...(data.category !== undefined && { category: data.category }),
      ...(data.description !== undefined && { description: data.description }),
    },
  });
}

/**
 * Permanently deletes a service type; global types can only be deleted by SUPER_ADMIN.
 * @param id - ServiceType integer ID
 * @param companyId - Tenant isolation company ID; null for SUPER_ADMIN
 * @param isSuperAdmin - Whether the caller is SUPER_ADMIN
 * @returns Deleted ServiceType record
 * @throws {AppError} If not found (404), or insufficient permissions (403)
 */
export async function deleteServiceType(id: number, companyId: string | null, isSuperAdmin: boolean) {
  const existing = await prisma.serviceType.findUnique({ where: { id } });
  if (!existing) throw new AppError('Servis tipi bulunamadı', 404);

  if (existing.companyId === null && !isSuperAdmin) {
    throw new AppError('Global servis tiplerini yalnızca SUPER_ADMIN silebilir', 403);
  }
  if (existing.companyId !== null && existing.companyId !== companyId && !isSuperAdmin) {
    throw new AppError('Bu servis tipi size ait değil', 403);
  }

  return prisma.serviceType.delete({ where: { id } });
}
