import { Request, Response, NextFunction } from 'express';
import {
  getExpenses, getExpenseById, createExpense, updateExpense, deleteExpense,
} from '../services/expenses.service';
import { logAudit } from '../services/audit.service';

/**
 * Returns a paginated, filterable list of expenses and income with totals.
 * @route GET /api/expenses
 * @access authenticate | requireRole('ADMIN')
 */
export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const companyId = req.user?.companyId ?? null;
    const page = Math.max(1, parseInt(String(req.query.page ?? '1')));
    const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize ?? '20'))));
    const result = await getExpenses({
      page, pageSize,
      search: String(req.query.search ?? '').trim() || undefined,
      type: String(req.query.type ?? '').trim() || undefined,
      category: String(req.query.category ?? '').trim() || undefined,
      currency: String(req.query.currency ?? '').trim() || undefined,
      customerId: String(req.query.customerId ?? '').trim() || undefined,
      shipId: String(req.query.shipId ?? '').trim() || undefined,
      serviceId: String(req.query.serviceId ?? '').trim() || undefined,
      dateFrom: String(req.query.dateFrom ?? '').trim() || undefined,
      dateTo: String(req.query.dateTo ?? '').trim() || undefined,
      sortBy: String(req.query.sortBy ?? 'date'),
      sortOrder: req.query.sortOrder === 'asc' ? 'asc' : 'desc',
    }, companyId);
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
}

/**
 * Returns a single expense record by ID.
 * @route GET /api/expenses/:id
 * @access authenticate | requireRole('ADMIN')
 */
export async function getOne(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const companyId = req.user?.companyId ?? null;
    const data = await getExpenseById(req.params.id, companyId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

/**
 * Creates a new expense or income record.
 * @route POST /api/expenses
 * @access authenticate | requireRole('ADMIN')
 */
export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.sub;
    const companyId = req.user?.companyId ?? undefined;
    const data = await createExpense({ ...req.body, createdById: userId }, companyId);
    await logAudit(req, 'Expense', 'CREATE', data.id);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
}

/**
 * Updates an expense record by ID.
 * @route PUT /api/expenses/:id
 * @access authenticate | requireRole('ADMIN')
 */
export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.sub;
    const companyId = req.user?.companyId ?? null;
    const data = await updateExpense(req.params.id, req.body, userId, companyId);
    await logAudit(req, 'Expense', 'UPDATE', req.params.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

/**
 * Soft-deletes an expense record by ID.
 * @route DELETE /api/expenses/:id
 * @access authenticate | requireRole('ADMIN')
 */
export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.sub;
    const companyId = req.user?.companyId ?? null;
    await deleteExpense(req.params.id, userId, companyId);
    await logAudit(req, 'Expense', 'DELETE', req.params.id);
    res.json({ success: true, message: 'Deleted' });
  } catch (err) { next(err); }
}
