import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/error.middleware';

export async function getProducts(companyId: string | null) {
  if (!companyId) return [];
  return prisma.product.findMany({
    where: { companyId, isActive: true },
    orderBy: { name: 'asc' },
  });
}

export async function getAllProducts(companyId: string | null) {
  if (!companyId) return [];
  return prisma.product.findMany({
    where: { companyId },
    orderBy: { name: 'asc' },
  });
}

export async function getProductById(id: string, companyId: string | null) {
  const product = await prisma.product.findFirst({
    where: { id, ...(companyId ? { companyId } : {}) },
  });
  if (!product) throw new AppError('Ürün bulunamadı', 404);
  return product;
}

export async function createProduct(
  data: {
    code: string;
    name: string;
    nameEn?: string;
    unit?: string;
    unitPriceEur?: number;
    unitPriceUsd?: number;
    unitPriceTry?: number;
    description?: string;
    isActive?: boolean;
  },
  companyId: string | null
) {
  if (!companyId) throw new AppError('Tenant seçilmedi', 400);
  return prisma.product.create({
    data: {
      companyId,
      code: data.code,
      name: data.name,
      nameEn: data.nameEn ?? null,
      unit: data.unit ?? 'ADET',
      unitPriceEur: data.unitPriceEur ?? null,
      unitPriceUsd: data.unitPriceUsd ?? null,
      unitPriceTry: data.unitPriceTry ?? null,
      description: data.description ?? null,
      isActive: data.isActive ?? true,
    },
  });
}

export async function updateProduct(
  id: string,
  data: Partial<{
    code: string;
    name: string;
    nameEn: string;
    unit: string;
    unitPriceEur: number;
    unitPriceUsd: number;
    unitPriceTry: number;
    description: string;
    isActive: boolean;
  }>,
  companyId: string | null
) {
  const existing = await prisma.product.findFirst({ where: { id, ...(companyId ? { companyId } : {}) } });
  if (!existing) throw new AppError('Ürün bulunamadı', 404);

  return prisma.product.update({ where: { id }, data });
}

export async function deleteProduct(id: string, companyId: string | null) {
  const existing = await prisma.product.findFirst({ where: { id, ...(companyId ? { companyId } : {}) } });
  if (!existing) throw new AppError('Ürün bulunamadı', 404);
  return prisma.product.delete({ where: { id } });
}
