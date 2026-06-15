import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import * as ctrl from '../controllers/devTasks.controller';

const router = Router();
router.use(authenticate);

router.get('/', ctrl.list);
router.post('/', ctrl.create);  // all authenticated users can submit
router.put('/:id', requireRole('ADMIN', 'MANAGER', 'SUPER_ADMIN'), ctrl.update);
router.delete('/:id', requireRole('ADMIN', 'SUPER_ADMIN'), ctrl.remove);

export default router;
