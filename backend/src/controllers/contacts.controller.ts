import { Request, Response, NextFunction } from 'express';
import { getContacts, createContact, updateContact, deleteContact } from '../services/contacts.service';
import { logAudit } from '../services/audit.service';

/**
 * Returns all contacts for a customer.
 * @route GET /api/customers/:customerId/contacts
 * @access authenticate
 */
export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const companyId = req.user?.companyId ?? null;
    const data = await getContacts(req.params.customerId, companyId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

/**
 * Creates a new contact for a customer.
 * @route POST /api/customers/:customerId/contacts
 * @access authenticate
 */
export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.sub;
    const companyId = req.user?.companyId ?? undefined;
    const data = await createContact(req.params.customerId, req.body, userId, companyId);
    await logAudit(req, 'Contact', 'CREATE', data.id);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
}

/**
 * Updates a contact's fields.
 * @route PUT /api/customers/:customerId/contacts/:id
 * @access authenticate
 */
export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.sub;
    const data = await updateContact(req.params.id, req.params.customerId, req.body, userId);
    await logAudit(req, 'Contact', 'UPDATE', req.params.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

/**
 * Soft-deletes a contact.
 * @route DELETE /api/customers/:customerId/contacts/:id
 * @access authenticate
 */
export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.sub;
    await deleteContact(req.params.id, userId);
    await logAudit(req, 'Contact', 'DELETE', req.params.id);
    res.json({ success: true, message: 'Deleted' });
  } catch (err) { next(err); }
}
