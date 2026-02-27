import { Request, Response, NextFunction } from 'express';
import {
  getCustomers, getCustomerById, createCustomer,
  updateCustomer, deleteCustomer, getCountryOptions,
} from '../services/customers.service';
import { logAudit } from '../services/audit.service';

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = Math.max(1, parseInt(String(req.query.page ?? '1')));
    const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize ?? '20'))));
    const result = await getCustomers({
      page, pageSize,
      search: String(req.query.search ?? '').trim() || undefined,
      country: String(req.query.country ?? '').trim() || undefined,
      isActive: req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined,
      sortBy: String(req.query.sortBy ?? 'name'),
      sortOrder: req.query.sortOrder === 'desc' ? 'desc' : 'asc',
    });
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
}

export async function getOne(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await getCustomerById(req.params.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.sub;
    const data = await createCustomer(req.body, userId);
    await logAudit(req, 'Customer', 'CREATE', data.id);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.sub;
    const data = await updateCustomer(req.params.id, req.body, userId);
    await logAudit(req, 'Customer', 'UPDATE', req.params.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.sub;
    await deleteCustomer(req.params.id, userId);
    await logAudit(req, 'Customer', 'DELETE', req.params.id);
    res.json({ success: true, message: 'Deleted' });
  } catch (err) { next(err); }
}

export async function countryOptions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await getCountryOptions();
    res.json({ success: true, data });
  } catch (err) { next(err); }
}
