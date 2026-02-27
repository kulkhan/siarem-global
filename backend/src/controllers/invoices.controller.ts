import { Request, Response, NextFunction } from 'express';
import { InvoiceStatus } from '@prisma/client';
import * as svc from '../services/invoices.service';
import { logAudit } from '../services/audit.service';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const companyId = req.user?.companyId ?? null;
    const {
      page = '1', pageSize = '20', search,
      customerId, serviceId, status, currency,
      dateFrom, dateTo, sortBy, sortOrder,
    } = req.query as Record<string, string>;

    const result = await svc.getInvoices({
      page: Number(page),
      pageSize: Number(pageSize),
      search,
      customerId,
      serviceId,
      status: status as InvoiceStatus | undefined,
      currency,
      dateFrom,
      dateTo,
      sortBy,
      sortOrder: sortOrder as 'asc' | 'desc' | undefined,
    }, companyId);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

export async function getOne(req: Request, res: Response, next: NextFunction) {
  try {
    const companyId = req.user?.companyId ?? null;
    const data = await svc.getInvoiceById(req.params.id, companyId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.sub;
    const companyId = req.user?.companyId ?? undefined;
    const data = await svc.createInvoice({ ...req.body, createdById: userId }, companyId);
    await logAudit(req, 'Invoice', 'CREATE', data.id);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.sub;
    const companyId = req.user?.companyId ?? null;
    const data = await svc.updateInvoice(req.params.id, req.body, userId, companyId);
    await logAudit(req, 'Invoice', 'UPDATE', req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.sub;
    const companyId = req.user?.companyId ?? null;
    await svc.deleteInvoice(req.params.id, userId, companyId);
    await logAudit(req, 'Invoice', 'DELETE', req.params.id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function createPayment(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await svc.addPayment(req.params.id, req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function removePayment(req: Request, res: Response, next: NextFunction) {
  try {
    await svc.deletePayment(req.params.paymentId);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function convertFromQuote(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.sub;
    const companyId = req.user?.companyId ?? null;
    const data = await svc.createInvoiceFromQuote(req.params.id, companyId, userId);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}
