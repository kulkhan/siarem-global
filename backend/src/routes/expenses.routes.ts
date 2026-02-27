import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import * as ctrl from '../controllers/expenses.controller';

const router = Router();
router.use(authenticate, requireRole('ADMIN'));

router.get('/', ctrl.list);
router.get('/:id', ctrl.getOne);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

export default router;
