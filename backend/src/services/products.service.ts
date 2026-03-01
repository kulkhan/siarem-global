import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/error.middleware';

/**
 * Returns all active products for a tenant, ordered by name.
 * @param companyId - Tenant isolation company ID
 * @returns Array of active product records, or empty array if companyId is null
 */
export async function getProducts(companyId: string | null) {
  if (!companyId) return [];
  return prisma.product.findMany({
    where: { companyId, isActive: true },
    orderBy: { name: 'asc' },
  });
}

/**
 * Returns all products for a tenant (active and inactive), ordered by name.
 * @param companyId - Tenant isolation company ID
 * @returns Array of all product records, or empty array if companyId is null
 */
export async function getAllProducts(companyId: string | null) {
  if (!companyId) return [];
  return prisma.product.findMany({
    where: { companyId },
    orderBy: { name: 'asc' },
  });
}

/**
 * Returns a single product by ID with optional tenant scoping.
 * @param id - Product ID
 * @param companyId - Tenant isolation company ID; null for SUPER_ADMIN
 * @returns Product record
 * @throws {AppError} If product is not found (404)
 */
export async function getProductById(id: string, companyId: string | null) {
  const product = await prisma.product.findFirst({
    where: { id, ...(companyId ? { companyId } : {}) },
  });
  if (!product) throw new AppError('Ürün bulunamadı', 404);
  return product;
}

/**
 * Creates a new product for a tenant.
 * @param data - Product fields (code, name, unit, prices, stock quantities, etc.)
 * @param companyId - Tenant isolation company ID
 * @returns Created product record
 * @throws {AppError} If tenant is missing (400)
 */
export async function createProduct(
  data: {
    code: string;
    name: string;
    nameEn?: string;
    unit?: string;
    unitPriceEur?: number | null;
    unitPriceUsd?: number | null;
    unitPriceTry?: number | null;
    description?: string;
    stockQuantity?: number | null;
    minStock?: number | null;
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
      stockQuantity: data.stockQuantity ?? null,
      minStock: data.minStock ?? null,
      isActive: data.isActive ?? true,
    },
  });
}

/**
 * Updates a product's fields after verifying tenant ownership.
 * @param id - Product ID
 * @param data - Partial update data
 * @param companyId - Tenant isolation company ID
 * @returns Updated product record
 * @throws {AppError} If product is not found (404)
 */
export async function updateProduct(
  id: string,
  data: Partial<{
    code: string;
    name: string;
    nameEn: string;
    unit: string;
    unitPriceEur: number | null;
    unitPriceUsd: number | null;
    unitPriceTry: number | null;
    description: string;
    stockQuantity: number | null;
    minStock: number | null;
    isActive: boolean;
  }>,
  companyId: string | null
) {
  const existing = await prisma.product.findFirst({ where: { id, ...(companyId ? { companyId } : {}) } });
  if (!existing) throw new AppError('Ürün bulunamadı', 404);

  return prisma.product.update({ where: { id }, data });
}

/**
 * Permanently deletes a product after verifying tenant ownership.
 * @param id - Product ID
 * @param companyId - Tenant isolation company ID
 * @returns Deleted product record
 * @throws {AppError} If product is not found (404)
 */
export async function deleteProduct(id: string, companyId: string | null) {
  const existing = await prisma.product.findFirst({ where: { id, ...(companyId ? { companyId } : {}) } });
  if (!existing) throw new AppError('Ürün bulunamadı', 404);
  return prisma.product.delete({ where: { id } });
}
