import { Request, Response, NextFunction } from 'express';
import { getContacts, createContact, updateContact, deleteContact } from '../services/contacts.service';
import { logAudit } from '../services/audit.service';

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await getContacts(req.params.customerId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.sub;
    const data = await createContact(req.params.customerId, req.body, userId);
    await logAudit(req, 'Contact', 'CREATE', data.id);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.sub;
    const data = await updateContact(req.params.id, req.params.customerId, req.body, userId);
    await logAudit(req, 'Contact', 'UPDATE', req.params.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.sub;
    await deleteContact(req.params.id, userId);
    await logAudit(req, 'Contact', 'DELETE', req.params.id);
    res.json({ success: true, message: 'Deleted' });
  } catch (err) { next(err); }
}
