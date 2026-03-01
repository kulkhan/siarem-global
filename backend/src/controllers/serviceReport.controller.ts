import { Request, Response, NextFunction } from 'express';
import * as svc from '../services/serviceReport.service';

export async function getReport(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await svc.getServiceReport(req.params.id, req.user!.companyId!);
    res.json({ success: true, data: data ?? null });
  } catch (err) {
    next(err);
  }
}

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
