import { Request, Response, NextFunction } from 'express';
import { QuoteStatus } from '@prisma/client';
import * as svc from '../services/quotes.service';
import { logAudit } from '../services/audit.service';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const { page = '1', pageSize = '20', search, customerId, serviceId, status, sortBy, sortOrder } =
      req.query as Record<string, string>;

    const result = await svc.getQuotes({
      page: Number(page),
      pageSize: Number(pageSize),
      search,
      customerId,
      serviceId,
      status: status as QuoteStatus | undefined,
      sortBy,
      sortOrder: sortOrder as 'asc' | 'desc' | undefined,
    });
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

export async function getOne(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await svc.getQuoteById(req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.sub;
    const data = await svc.createQuote({ ...req.body, createdById: userId });
    await logAudit(req, 'Quote', 'CREATE', data.id);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.sub;
    const data = await svc.updateQuote(req.params.id, req.body, userId);
    await logAudit(req, 'Quote', 'UPDATE', req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.sub;
    await svc.deleteQuote(req.params.id, userId);
    await logAudit(req, 'Quote', 'DELETE', req.params.id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}
