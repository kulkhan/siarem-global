import { Request, Response, NextFunction } from 'express';
import { getAuditLogs } from '../services/audit.service';

/**
 * Returns paginated audit logs filtered by entity type, action, user, and date range.
 * @route GET /api/audit
 * @access authenticate | requireRole('ADMIN')
 */
export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const companyId = req.user?.companyId ?? null;
    const { entityType, action, userId, from, to, page, limit } = req.query as Record<string, string>;
    const result = await getAuditLogs({
      entityType,
      action,
      userId,
      from,
      to,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    }, companyId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
