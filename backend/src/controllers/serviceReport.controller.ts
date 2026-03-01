import { Request, Response, NextFunction } from 'express';
import * as svc from '../services/serviceReport.service';

/**
 * Returns the service report for a service, or null if none exists.
 * @route GET /api/services/:id/report
 * @access authenticate
 */
export async function getReport(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await svc.getServiceReport(req.params.id, req.user!.companyId!);
    res.json({ success: true, data: data ?? null });
  } catch (err) {
    next(err);
  }
}

/**
 * Creates or updates the service report for a service.
 * @route PUT /api/services/:id/report
 * @access authenticate
 */
export async function upsertReport(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await svc.upsertServiceReport(
      req.params.id,
      req.user!.companyId!,
      req.user!.sub,
      req.body
    );
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}
