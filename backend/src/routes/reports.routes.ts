import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import * as ctrl from '../controllers/reports.controller';

const router = Router();

router.use(authenticate);
router.get('/revenue', ctrl.revenue);   // ?months=6
router.get('/stock', ctrl.stock);
router.get('/services', ctrl.services); // ?months=6
router.get('/customers', ctrl.customers);

export default router;
