import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/error.middleware';

export interface CompanyCreateData {
  name: string;
  domain: string;
  slug: string;
  plan?: string;
  logoUrl?: string;
}

export interface CompanyUpdateData {
  name?: string;
  domain?: string;
  slug?: string;
  plan?: string;
  logoUrl?: string;
  isActive?: boolean;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  taxNumber?: string;
  website?: string;
  companyType?: string;
  modules?: string[];
}

/**
 * Updates a company's type and enabled module list (SUPER_ADMIN only).
 * @param id - Company ID
 * @param companyType - Company type string (e.g. 'MARITIME', 'GENERAL_SERVICE')
 * @param modules - Array of module keys to enable (e.g. ['SHIPS', 'SERVICE_REPORT'])
 * @returns Updated company record
 * @throws {AppError} If company is not found (404)
 */
export async function updateCompanyModules(id: string, companyType: string, modules: string[]) {
  const company = await prisma.company.findUnique({ where: { id } });
  if (!company) throw new AppError('Şirket bulunamadı', 404);
  return prisma.company.update({ where: { id }, data: { companyType, modules } });
}

// Fields an ADMIN can self-update (excludes slug/domain/plan/isActive)
export interface CompanySelfUpdateData {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  taxNumber?: string;
  website?: string;
}

/**
 * Returns all companies ordered by creation date, including user and customer counts.
 * @returns Array of company records with _count aggregates
 */
export async function getCompanies() {
  return prisma.company.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { users: true, customers: true } },
    },
  });
}

/**
 * Returns a single company by ID with users list and entity counts.
 * @param id - Company ID
 * @returns Company record with included users and _count aggregates
 * @throws {AppError} If company is not found (404)
 */
export async function getCompanyById(id: string) {
  const company = await prisma.company.findUnique({
    where: { id },
    include: {
      _count: { select: { users: true, customers: true, services: true } },
      users: {
        select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      },
    },
  });
  if (!company) throw new AppError('Şirket bulunamadı', 404);
  return company;
}

/**
 * Creates a new company after verifying domain and slug uniqueness.
 * @param data - Company creation data including name, domain, and slug
 * @returns Created company record
 * @throws {AppError} If domain or slug is already in use (400)
 */
export async function createCompany(data: CompanyCreateData) {
  const domainExists = await prisma.company.findUnique({ where: { domain: data.domain } });
  if (domainExists) throw new AppError('Bu domain zaten kullanımda', 400);

  const slugExists = await prisma.company.findUnique({ where: { slug: data.slug } });
  if (slugExists) throw new AppError('Bu slug zaten kullanımda', 400);

  return prisma.company.create({ data });
}

/**
 * Updates a company's fields after verifying domain/slug uniqueness on change.
 * @param id - Company ID
 * @param data - Partial update data
 * @returns Updated company record
 * @throws {AppError} If company is not found (404) or new domain/slug is taken (400)
 */
export async function updateCompany(id: string, data: CompanyUpdateData) {
  const company = await prisma.company.findUnique({ where: { id } });
  if (!company) throw new AppError('Şirket bulunamadı', 404);

  if (data.domain && data.domain !== company.domain) {
    const exists = await prisma.company.findUnique({ where: { domain: data.domain } });
    if (exists) throw new AppError('Bu domain zaten kullanımda', 400);
  }

  if (data.slug && data.slug !== company.slug) {
    const exists = await prisma.company.findUnique({ where: { slug: data.slug } });
    if (exists) throw new AppError('Bu slug zaten kullanımda', 400);
  }

  return prisma.company.update({ where: { id }, data });
}

/**
 * Permanently deletes a company, blocking if it still has associated users.
 * @param id - Company ID
 * @returns Deleted company record
 * @throws {AppError} If company is not found (404) or has remaining users (400)
 */
export async function deleteCompany(id: string) {
  const company = await prisma.company.findUnique({
    where: { id },
    include: { _count: { select: { users: true } } },
  });
  if (!company) throw new AppError('Şirket bulunamadı', 404);

  // Soft check: şirkete bağlı kullanıcı varsa uyar
  if (company._count.users > 0) {
    throw new AppError(`Bu şirkete bağlı ${company._count.users} kullanıcı var. Önce kullanıcıları silin veya taşıyın.`, 400);
  }

  return prisma.company.delete({ where: { id } });
}
