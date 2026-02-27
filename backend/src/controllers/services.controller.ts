import { Request, Response, NextFunction } from 'express';
import { ServiceStatus, Priority } from '@prisma/client';
import * as svc from '../services/services.service';
import { logAudit } from '../services/audit.service';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const companyId = req.user?.companyId ?? null;
    const {
      page = '1', pageSize = '20', search,
      customerId, shipId, serviceTypeId,
      status, priority, assignedUserId,
      sortBy, sortOrder,
    } = req.query as Record<string, string>;

    const result = await svc.getServices({
      page: Number(page),
      pageSize: Number(pageSize),
      search,
      customerId,
      shipId,
      serviceTypeId: serviceTypeId ? Number(serviceTypeId) : undefined,
      status: status as ServiceStatus | undefined,
      priority: priority as Priority | undefined,
      assignedUserId,
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
    const data = await svc.getServiceById(req.params.id, companyId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.sub;
    const companyId = req.user?.companyId ?? undefined;
    const data = await svc.createService(req.body, userId, companyId);
    await logAudit(req, 'Service', 'CREATE', data.id);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.sub;
    const companyId = req.user?.companyId ?? null;
    const data = await svc.updateService(req.params.id, req.body, userId, companyId);
    await logAudit(req, 'Service', 'UPDATE', req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.sub;
    const companyId = req.user?.companyId ?? null;
    await svc.deleteService(req.params.id, userId, companyId);
    await logAudit(req, 'Service', 'DELETE', req.params.id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function types(req: Request, res: Response, next: NextFunction) {
  try {
    const companyId = req.user?.companyId ?? null;
    const data = await svc.getServiceTypes(companyId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}
