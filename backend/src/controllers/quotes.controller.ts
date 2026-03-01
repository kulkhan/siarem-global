import { Request, Response, NextFunction } from 'express';
import { QuoteStatus } from '@prisma/client';
import * as svc from '../services/quotes.service';
import { logAudit } from '../services/audit.service';

/**
 * Returns a paginated, filterable list of quotes.
 * @route GET /api/quotes
 * @access authenticate
 */
export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const companyId = req.user?.companyId ?? null;
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
    }, companyId);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

/**
 * Returns a single quote with ships, invoices, and line items.
 * @route GET /api/quotes/:id
 * @access authenticate
 */
export async function getOne(req: Request, res: Response, next: NextFunction) {
  try {
    const companyId = req.user?.companyId ?? null;
    const data = await svc.getQuoteById(req.params.id, companyId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

/**
 * Creates a new quote with optional line items.
 * @route POST /api/quotes
 * @access authenticate
 */
export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.sub;
    const companyId = req.user?.companyId ?? undefined;
    const data = await svc.createQuote({ ...req.body, createdById: userId }, companyId);
    await logAudit(req, 'Quote', 'CREATE', data.id);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

/**
 * Updates a quote and replaces line items.
 * @route PUT /api/quotes/:id
 * @access authenticate
 */
export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.sub;
    const companyId = req.user?.companyId ?? null;
    const data = await svc.updateQuote(req.params.id, req.body, userId, companyId);
    await logAudit(req, 'Quote', 'UPDATE', req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

/**
 * Soft-deletes a quote by ID.
 * @route DELETE /api/quotes/:id
 * @access authenticate
 */
export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.sub;
    const companyId = req.user?.companyId ?? null;
    await svc.deleteQuote(req.params.id, userId, companyId);
    await logAudit(req, 'Quote', 'DELETE', req.params.id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}
