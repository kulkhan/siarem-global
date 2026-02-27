import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { env } from '../config/env';

export interface TenantInfo {
  id: string;
  slug: string;
  domain: string;
  name: string;
}

declare global {
  namespace Express {
    interface Request {
      tenant?: TenantInfo;
    }
  }
}

export async function resolveTenant(req: Request, res: Response, next: NextFunction): Promise<void> {
  const tenantDomain = req.headers['x-tenant-domain'] as string | undefined;

  // No header → super admin request or internal call, skip tenant resolution
  if (!tenantDomain) {
    return next();
  }

  // Admin domain → bypass tenant resolution
  if (tenantDomain === env.adminDomain) {
    return next();
  }

  // Development fallback: localhost/127.0.0.1 → use first active company
  if (tenantDomain === 'localhost' || tenantDomain === '127.0.0.1') {
    try {
      const defaultCompany = await prisma.company.findFirst({
        where: { isActive: true },
        select: { id: true, slug: true, domain: true, name: true },
        orderBy: { createdAt: 'asc' },
      });
      if (defaultCompany) {
        req.tenant = defaultCompany;
      }
    } catch { /* ignore */ }
    return next();
  }

  try {
    const company = await prisma.company.findUnique({
      where: { domain: tenantDomain },
      select: { id: true, slug: true, domain: true, name: true, isActive: true },
    });

    if (!company || !company.isActive) {
      res.status(404).json({ success: false, message: 'Tenant bulunamadı' });
      return;
    }

    req.tenant = {
      id: company.id,
      slug: company.slug,
      domain: company.domain,
      name: company.name,
    };

    next();
  } catch {
    res.status(500).json({ success: false, message: 'Tenant çözümlenemedi' });
  }
}
