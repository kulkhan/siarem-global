import { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { loginUser, getCurrentUser, registerTenant } from '../services/auth.service';
import { prisma } from '../lib/prisma';
import { env } from '../config/env';
import { verifyRecaptcha } from '../lib/recaptcha';

export const loginValidation = [
  body('email').isEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password required'),
];

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, errors: errors.array() });
    return;
  }

  try {
    const { tenantSlug } = req.body as { tenantSlug?: string };
    let companyId: string | null = null;

    if (tenantSlug !== undefined) {
      // Explicit slug from general/main domain login form
      if (tenantSlug === '') {
        // Empty slug → SUPER_ADMIN login (companyId stays null)
        companyId = null;
      } else {
        const company = await prisma.company.findUnique({
          where: { slug: tenantSlug },
          select: { id: true, isActive: true },
        });
        if (!company || !company.isActive) {
          res.status(404).json({ success: false, message: 'Firma bulunamadı. Lütfen firma kodunu kontrol edin.' });
          return;
        }
        companyId = company.id;
      }
    } else {
      // No slug in body → use domain-resolved tenant
      const tenantDomain = req.headers['x-tenant-domain'] as string | undefined;
      if (tenantDomain && tenantDomain !== env.adminDomain) {
        companyId = req.tenant?.id ?? null;
        if (!companyId) {
          res.status(404).json({ success: false, message: 'Tenant bulunamadı' });
          return;
        }
      }
    }

    const result = await loginUser(req.body.email, req.body.password, companyId);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { companyName, slug, adminName, adminEmail, adminPassword, recaptchaToken } = req.body as {
      companyName?: string; slug?: string; adminName?: string; adminEmail?: string; adminPassword?: string; recaptchaToken?: string;
    };

    const captchaOk = await verifyRecaptcha(recaptchaToken ?? '');
    if (!captchaOk) {
      res.status(400).json({ success: false, message: 'CAPTCHA doğrulaması başarısız. Lütfen tekrar deneyin.' });
      return;
    }

    if (!companyName || !slug || !adminName || !adminEmail || !adminPassword) {
      res.status(400).json({ success: false, message: 'Tüm alanlar zorunludur' });
      return;
    }

    if (adminPassword.length < 8) {
      res.status(400).json({ success: false, message: 'Şifre en az 8 karakter olmalıdır' });
      return;
    }

    const result = await registerTenant({ companyName, slug, adminName, adminEmail, adminPassword });
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await getCurrentUser(req.user!.sub);
    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
}

export function logout(_req: Request, res: Response): void {
  res.json({ success: true, message: 'Logged out' });
}
