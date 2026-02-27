import { Request, Response, NextFunction } from 'express';
import { getAuditLogs } from '../services/audit.service';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const { entityType, action, userId, from, to, page, limit } = req.query as Record<string, string>;
    const result = await getAuditLogs({
      entityType,
      action,
      userId,
      from,
      to,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}
