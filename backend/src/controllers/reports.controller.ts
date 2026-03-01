import { Request, Response, NextFunction } from 'express';
import * as svc from '../services/reports.service';

/**
 * Gelir / Finansal raporu döndürür.
 * @route GET /api/reports/revenue
 * @access authenticate
 */
export async function revenue(req: Request, res: Response, next: NextFunction) {
  try {
    const companyId = req.user!.companyId!;
    const months = parseInt(String(req.query.months ?? '6'), 10);
    const data = await svc.getRevenueReport(companyId, months);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

/**
 * Stok / Envanter raporunu döndürür.
 * @route GET /api/reports/stock
 * @access authenticate
 */
export async function stock(req: Request, res: Response, next: NextFunction) {
  try {
    const companyId = req.user!.companyId!;
    const data = await svc.getStockReport(companyId);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

/**
 * Servis performans raporunu döndürür.
 * @route GET /api/reports/services
 * @access authenticate
 */
export async function services(req: Request, res: Response, next: NextFunction) {
  try {
    const companyId = req.user!.companyId!;
    const months = parseInt(String(req.query.months ?? '6'), 10);
    const data = await svc.getServiceReport(companyId, months);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

/**
 * Müşteri raporunu döndürür.
 * @route GET /api/reports/customers
 * @access authenticate
 */
export async function customers(req: Request, res: Response, next: NextFunction) {
  try {
    const companyId = req.user!.companyId!;
    const data = await svc.getCustomerReport(companyId);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}
