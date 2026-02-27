import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import * as ctrl from '../controllers/users.controller';

const router = Router();
router.use(authenticate);

router.get('/', ctrl.list);
router.post('/', requireRole('ADMIN'), ctrl.create);
router.put('/:id', requireRole('ADMIN'), ctrl.update);
router.delete('/:id', requireRole('ADMIN'), ctrl.remove);
router.put('/:id/password', ctrl.changePassword);

export default router;
