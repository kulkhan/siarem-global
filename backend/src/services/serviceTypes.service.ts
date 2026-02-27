import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/error.middleware';

export async function getServiceTypes(companyId: string | null) {
  return prisma.serviceType.findMany({
    where: { OR: [{ companyId: null }, ...(companyId ? [{ companyId }] : [])] },
    orderBy: [{ companyId: 'asc' }, { nameEn: 'asc' }],
  });
}

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
