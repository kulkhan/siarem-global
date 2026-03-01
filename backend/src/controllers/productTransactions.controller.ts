import { Request, Response, NextFunction } from 'express';
import * as svc from '../services/productTransactions.service';

/**
 * Bir ürünün stok hareket geçmişini döndürür.
 * @route GET /api/products/:id/transactions
 * @access authenticate
 */
export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const companyId = req.user!.companyId!;
    const data = await svc.listTransactions(req.params.id, companyId);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

/**
 * Manuel stok hareketi oluşturur (IN veya ADJUSTMENT).
 * @route POST /api/products/:id/transactions
 * @access requireRole('ADMIN', 'MANAGER')
 */
export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const companyId = req.user!.companyId!;
    const userId = req.user!.sub;
    const { type, quantity, notes } = req.body;
    const data = await svc.createTransaction(
      { productId: req.params.id, type, quantity: Number(quantity), notes },
      companyId,
      userId
    );
    res.status(201).json({ success: true, data });
  } catch (e) {
    next(e);
  }
}
