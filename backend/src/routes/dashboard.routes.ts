import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { stats } from '../controllers/dashboard.controller';

const router = Router();
router.use(authenticate);
router.get('/', stats);

export default router;
