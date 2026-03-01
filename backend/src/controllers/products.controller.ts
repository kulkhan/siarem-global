import { Request, Response, NextFunction } from 'express';
import * as svc from '../services/products.service';

/**
 * Returns all products (active and inactive) for the tenant.
 * @route GET /api/products
 * @access authenticate
 */
export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const companyId = req.user?.companyId ?? null;
    const products = await svc.getAllProducts(companyId);
    res.json({ success: true, data: products });
  } catch (err) { next(err); }
}

/**
 * Creates a new product for the tenant.
 * @route POST /api/products
 * @access authenticate | requireRole('ADMIN')
 */
export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const companyId = req.user?.companyId ?? null;
    const product = await svc.createProduct(req.body, companyId);
    res.status(201).json({ success: true, data: product });
  } catch (err) { next(err); }
}

/**
 * Updates a product by ID.
 * @route PUT /api/products/:id
 * @access authenticate | requireRole('ADMIN')
 */
export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const companyId = req.user?.companyId ?? null;
    const product = await svc.updateProduct(req.params.id, req.body, companyId);
    res.json({ success: true, data: product });
  } catch (err) { next(err); }
}

/**
 * Permanently deletes a product by ID.
 * @route DELETE /api/products/:id
 * @access authenticate | requireRole('ADMIN')
 */
export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const companyId = req.user?.companyId ?? null;
    await svc.deleteProduct(req.params.id, companyId);
    res.json({ success: true });
  } catch (err) { next(err); }
}
