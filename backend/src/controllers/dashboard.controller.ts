import { Request, Response, NextFunction } from 'express';
import { getDashboardStats } from '../services/dashboard.service';

export async function stats(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const companyId = req.user?.companyId ?? null;
    const data = await getDashboardStats(companyId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}
