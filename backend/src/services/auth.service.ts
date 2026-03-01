import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { env } from '../config/env';
import { AppError } from '../middleware/error.middleware';

export interface RegisterTenantData {
  companyName: string;
  slug: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
}

/**
 * Registers a new tenant by creating a company and its first ADMIN user.
 * @param data - Registration details including company name, slug, and admin credentials
 * @returns Created company summary (id, name, slug, domain)
 * @throws {AppError} If slug/domain/email is already in use
 */
export async function registerTenant(data: RegisterTenantData) {
  const slugClean = data.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  if (!slugClean) throw new AppError('Geçerli bir firma kodu girin', 400);

  const slugExists = await prisma.company.findUnique({ where: { slug: slugClean } });
  if (slugExists) throw new AppError('Bu firma kodu zaten kullanımda', 400);

  const emailExists = await prisma.user.findFirst({ where: { email: data.adminEmail } });
  if (emailExists) throw new AppError('Bu e-posta adresi zaten kayıtlı', 400);

  const domain = `${slugClean}.siarem.com`;
  const domainExists = await prisma.company.findUnique({ where: { domain } });
  if (domainExists) throw new AppError('Bu domain zaten kullanımda', 400);

  const hashedPw = await bcrypt.hash(data.adminPassword, 12);

  const company = await prisma.company.create({
    data: { name: data.companyName, slug: slugClean, domain, plan: 'free', isActive: true },
  });

  await prisma.user.create({
    data: {
      name: data.adminName,
      email: data.adminEmail,
      password: hashedPw,
      role: 'ADMIN',
      companyId: company.id,
      isActive: true,
    },
  });

  return { company: { id: company.id, name: company.name, slug: company.slug, domain: company.domain } };
}

/**
 * Authenticates a user and returns a signed JWT with company module info.
 * @param email - User's email address
 * @param password - Plain-text password to verify against stored hash
 * @param companyId - Tenant company ID; null triggers SUPER_ADMIN login path
 * @returns JWT token and user profile including companyModules
 * @throws {AppError} If credentials are invalid or user is inactive (401)
 */
export async function loginUser(email: string, password: string, companyId: string | null) {
  let user;

  if (companyId === null) {
    // Super admin login: find user with null companyId and SUPER_ADMIN role
    user = await prisma.user.findFirst({
      where: { email, companyId: null, role: 'SUPER_ADMIN' },
    });
  } else {
    // Tenant user login: find user within the specific company
    user = await prisma.user.findFirst({
      where: { email, companyId },
    });
  }

  if (!user || !user.isActive) {
    throw new AppError('Invalid email or password', 401);
  }

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    throw new AppError('Invalid email or password', 401);
  }

  // Fetch company modules for sidebar filtering
  let companyModules: string[] = [];
  if (user.companyId) {
    const company = await prisma.company.findUnique({
      where: { id: user.companyId },
      select: { modules: true },
    });
    companyModules = company?.modules ?? [];
  }

  const token = jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      companyId: user.companyId ?? null,
    },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn } as jwt.SignOptions
  );

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      companyId: user.companyId ?? null,
      companyModules,
    },
  };
}

/**
 * Retrieves the current authenticated user's profile and company modules.
 * @param userId - The authenticated user's ID (from JWT sub)
 * @returns User profile with companyModules array for sidebar filtering
 * @throws {AppError} If user is not found or inactive (404)
 */
export async function getCurrentUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      companyId: true,
      isActive: true,
      createdAt: true,
      company: { select: { modules: true } },
    },
  });
  if (!user || !user.isActive) {
    throw new AppError('User not found', 404);
  }
  const { company, ...rest } = user;
  return { ...rest, companyModules: company?.modules ?? [] };
}
