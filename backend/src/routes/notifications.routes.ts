import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import * as ctrl from '../controllers/notifications.controller';

const router = Router();

router.use(authenticate);
router.get('/summary', ctrl.getSummary);

export default router;
