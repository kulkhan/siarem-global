import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { list } from '../controllers/audit.controller';

const router = Router();

router.use(authenticate, requireRole('ADMIN'));

router.get('/', list);

export default router;
