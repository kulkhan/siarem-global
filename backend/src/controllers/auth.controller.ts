import { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { loginUser, getCurrentUser } from '../services/auth.service';
import { env } from '../config/env';

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
    // Determine tenant from X-Tenant-Domain header
    const tenantDomain = req.headers['x-tenant-domain'] as string | undefined;
    let companyId: string | null = null;

    if (tenantDomain && tenantDomain !== env.adminDomain) {
      // req.tenant is set by tenant middleware for non-admin domains
      companyId = req.tenant?.id ?? null;
      if (!companyId) {
        res.status(404).json({ success: false, message: 'Tenant bulunamadı' });
        return;
      }
    }

    const result = await loginUser(req.body.email, req.body.password, companyId);
    res.json({ success: true, ...result });
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
