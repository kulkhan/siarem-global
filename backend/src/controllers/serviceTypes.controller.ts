import { Request, Response, NextFunction } from 'express';
import * as svc from '../services/serviceTypes.service';

/**
 * Returns global and company-specific service types.
 * @route GET /api/service-types
 * @access authenticate
 */
export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const companyId = req.user?.companyId ?? null;
    const types = await svc.getServiceTypes(companyId);
    res.json({ success: true, data: types });
  } catch (err) { next(err); }
}

/**
 * Creates a new service type; SUPER_ADMIN can create global types.
 * @route POST /api/service-types
 * @access authenticate | requireRole('ADMIN')
 */
export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const companyId = req.user?.companyId ?? null;
    const isSuperAdmin = req.user?.role === 'SUPER_ADMIN';
    const type = await svc.createServiceType(req.body, companyId, isSuperAdmin);
    res.status(201).json({ success: true, data: type });
  } catch (err) { next(err); }
}

/**
 * Updates a service type by ID.
 * @route PUT /api/service-types/:id
 * @access authenticate | requireRole('ADMIN')
 */
export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id, 10);
    const companyId = req.user?.companyId ?? null;
    const isSuperAdmin = req.user?.role === 'SUPER_ADMIN';
    const type = await svc.updateServiceType(id, req.body, companyId, isSuperAdmin);
    res.json({ success: true, data: type });
  } catch (err) { next(err); }
}

/**
 * Permanently deletes a service type by ID.
 * @route DELETE /api/service-types/:id
 * @access authenticate | requireRole('ADMIN')
 */
export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params.id, 10);
    const companyId = req.user?.companyId ?? null;
    const isSuperAdmin = req.user?.role === 'SUPER_ADMIN';
    await svc.deleteServiceType(id, companyId, isSuperAdmin);
    res.json({ success: true });
  } catch (err) { next(err); }
}
