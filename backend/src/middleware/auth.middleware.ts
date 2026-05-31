import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from './error.middleware';

/** Shape of the decoded JWT payload attached to req.user after authentication. */
export interface JwtPayload {
  sub: string;            // User ID (cuid)
  email: string;
  role: string;           // 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'USER'
  name: string;
  companyId: string | null; // null for SUPER_ADMIN
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * Express middleware that validates the Bearer JWT in Authorization header.
 * On success, attaches the decoded payload to req.user.
 * For SUPER_ADMIN, overrides req.user.companyId with X-Selected-Company header
 * so that service queries are scoped to the chosen tenant.
 */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return next(new AppError('Authentication required', 401));
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, env.jwtSecret) as JwtPayload;
    req.user = payload;

    // SUPER_ADMIN: allow overriding the effective companyId via header
    if (payload.role === 'SUPER_ADMIN') {
      const selected = req.headers['x-selected-company'] as string | undefined;
      if (selected) {
        req.user = { ...payload, companyId: selected };
      }
    }

    next();
  } catch {
    next(new AppError('Invalid or expired token', 401));
  }
}

/**
 * Factory that returns middleware enforcing one of the given roles.
 * SUPER_ADMIN bypasses all role checks automatically.
 * @param roles - Allowed role strings (e.g. 'ADMIN', 'MANAGER')
 */
export function requireRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }
    // SUPER_ADMIN bypasses all role checks
    if (req.user.role === 'SUPER_ADMIN') {
      return next();
    }
    if (!roles.includes(req.user.role)) {
      return next(new AppError('Insufficient permissions', 403));
    }
    next();
  };
}
