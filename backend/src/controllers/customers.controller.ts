import { Request, Response, NextFunction } from 'express';
import {
  getCustomers, getCustomerById, createCustomer,
  updateCustomer, deleteCustomer, getCountryOptions,
  getBankAccounts, createBankAccount, updateBankAccount, deleteBankAccount,
} from '../services/customers.service';
import { logAudit } from '../services/audit.service';

/**
 * Returns a paginated, filterable list of customers.
 * @route GET /api/customers
 * @access authenticate
 */
export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const companyId = req.user?.companyId ?? null;
    const page = Math.max(1, parseInt(String(req.query.page ?? '1')));
    const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize ?? '20'))));
    const result = await getCustomers({
      page, pageSize,
      search: String(req.query.search ?? '').trim() || undefined,
      country: String(req.query.country ?? '').trim() || undefined,
      isActive: req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined,
      sortBy: String(req.query.sortBy ?? 'name'),
      sortOrder: req.query.sortOrder === 'desc' ? 'desc' : 'asc',
    }, companyId);
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
}

/**
 * Returns a single customer with contacts, bank accounts, assignees, and counts.
 * @route GET /api/customers/:id
 * @access authenticate
 */
export async function getOne(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const companyId = req.user?.companyId ?? null;
    const data = await getCustomerById(req.params.id, companyId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

/**
 * Creates a new customer.
 * @route POST /api/customers
 * @access authenticate
 */
export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.sub;
    const companyId = req.user?.companyId ?? undefined;
    const data = await createCustomer(req.body, userId, companyId);
    await logAudit(req, 'Customer', 'CREATE', data.id);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
}

/**
 * Updates a customer's profile fields.
 * @route PUT /api/customers/:id
 * @access authenticate
 */
export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.sub;
    const companyId = req.user?.companyId ?? null;
    const data = await updateCustomer(req.params.id, req.body, userId, companyId);
    await logAudit(req, 'Customer', 'UPDATE', req.params.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

/**
 * Soft-deletes a customer.
 * @route DELETE /api/customers/:id
 * @access authenticate
 */
export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.sub;
    const companyId = req.user?.companyId ?? null;
    await deleteCustomer(req.params.id, userId, companyId);
    await logAudit(req, 'Customer', 'DELETE', req.params.id);
    res.json({ success: true, message: 'Deleted' });
  } catch (err) { next(err); }
}

/**
 * Returns a distinct list of country values used in customer records.
 * @route GET /api/customers/options/countries
 * @access authenticate
 */
export async function countryOptions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const companyId = req.user?.companyId ?? null;
    const data = await getCountryOptions(companyId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

/**
 * Returns all bank accounts for a customer.
 * @route GET /api/customers/:customerId/bank-accounts
 * @access authenticate
 */
export async function listBankAccounts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const companyId = req.user?.companyId ?? null;
    const data = await getBankAccounts(req.params.customerId, companyId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

/**
 * Creates a bank account for a customer.
 * @route POST /api/customers/:customerId/bank-accounts
 * @access authenticate | requireRole('ADMIN', 'MANAGER')
 */
export async function createBankAccountHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) { res.status(403).json({ message: 'No tenant' }); return; }
    const data = await createBankAccount(req.params.customerId, req.body, companyId);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
}

/**
 * Updates a customer bank account.
 * @route PUT /api/customers/:customerId/bank-accounts/:bankId
 * @access authenticate | requireRole('ADMIN', 'MANAGER')
 */
export async function updateBankAccountHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const companyId = req.user?.companyId ?? null;
    const data = await updateBankAccount(req.params.bankId, req.body, companyId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

/**
 * Permanently deletes a customer bank account.
 * @route DELETE /api/customers/:customerId/bank-accounts/:bankId
 * @access authenticate | requireRole('ADMIN', 'MANAGER')
 */
export async function deleteBankAccountHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const companyId = req.user?.companyId ?? null;
    await deleteBankAccount(req.params.bankId, companyId);
    res.json({ success: true });
  } catch (err) { next(err); }
}
