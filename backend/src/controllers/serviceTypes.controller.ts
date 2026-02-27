import { Request, Response, NextFunction } from 'express';
import * as svc from '../services/serviceTypes.service';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const companyId = req.user?.companyId ?? null;
    const types = await svc.getServiceTypes(companyId);
    res.json({ success: true, data: types });
  } catch (err) { next(err); }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const companyId = req.user?.companyId ?? null;
    const isSuperAdmin = req.user?.role === 'SUPER_ADMIN';
    const type = await svc.createServiceType(req.body, companyId, isSuperAdmin);
    res.status(201).json({ success: true, data: type });
  } catch (err) { next(err); }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id, 10);
    const companyId = req.user?.companyId ?? null;
    const isSuperAdmin = req.user?.role === 'SUPER_ADMIN';
    const type = await svc.updateServiceType(id, req.body, companyId, isSuperAdmin);
    res.json({ success: true, data: type });
  } catch (err) { next(err); }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id, 10);
    const companyId = req.user?.companyId ?? null;
    const isSuperAdmin = req.user?.role === 'SUPER_ADMIN';
    await svc.deleteServiceType(id, companyId, isSuperAdmin);
    res.json({ success: true });
  } catch (err) { next(err); }
}
