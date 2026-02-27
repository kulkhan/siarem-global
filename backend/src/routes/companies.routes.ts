import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import * as ctrl from '../controllers/companies.controller';

const router = Router();

// All company routes require SUPER_ADMIN
router.use(authenticate, requireRole('SUPER_ADMIN'));

router.get('/', ctrl.listCompanies);
router.get('/:id', ctrl.getCompany);
router.post('/', ctrl.createCompany);
router.put('/:id', ctrl.updateCompany);
router.delete('/:id', ctrl.deleteCompany);

export default router;
