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

export async function getCompanies() {
  return prisma.company.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { users: true, customers: true } },
    },
  });
}

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

export async function createCompany(data: CompanyCreateData) {
  const domainExists = await prisma.company.findUnique({ where: { domain: data.domain } });
  if (domainExists) throw new AppError('Bu domain zaten kullanımda', 400);

  const slugExists = await prisma.company.findUnique({ where: { slug: data.slug } });
  if (slugExists) throw new AppError('Bu slug zaten kullanımda', 400);

  return prisma.company.create({ data });
}

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
