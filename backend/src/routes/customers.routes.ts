import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import {
  list, getOne, create, update, remove, countryOptions,
  listBankAccounts, createBankAccountHandler, updateBankAccountHandler, deleteBankAccountHandler,
} from '../controllers/customers.controller';
import contactsRoutes from './contacts.routes';
import { Request, Response, NextFunction } from 'express';
import { getAssignees, addAssignee, removeAssignee } from '../services/customerAssignees.service';

const router = Router();
router.use(authenticate);

router.get('/', list);
router.get('/options/countries', countryOptions);
router.get('/:id', getOne);
router.post('/', create);
router.put('/:id', update);
router.delete('/:id', remove);

// Nested: /customers/:customerId/contacts
router.use('/:customerId/contacts', contactsRoutes);

// Assignees: /customers/:customerId/assignees
router.get('/:customerId/assignees', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await getAssignees(req.params.customerId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.post('/:customerId/assignees', requireRole('ADMIN', 'MANAGER'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.body;
    const data = await addAssignee(req.params.customerId, userId);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
});

router.delete('/:customerId/assignees/:userId', requireRole('ADMIN', 'MANAGER'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await removeAssignee(req.params.customerId, req.params.userId);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// Bank accounts: /customers/:customerId/bank-accounts
router.get('/:customerId/bank-accounts', listBankAccounts);
router.post('/:customerId/bank-accounts', requireRole('ADMIN', 'MANAGER'), createBankAccountHandler);
router.put('/:customerId/bank-accounts/:bankId', requireRole('ADMIN', 'MANAGER'), updateBankAccountHandler);
router.delete('/:customerId/bank-accounts/:bankId', requireRole('ADMIN', 'MANAGER'), deleteBankAccountHandler);

export default router;
