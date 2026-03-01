import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import * as ctrl from '../controllers/products.controller';
import * as txCtrl from '../controllers/productTransactions.controller';

const router = Router();

router.use(authenticate);
router.get('/', ctrl.list);
router.post('/', requireRole('ADMIN'), ctrl.create);
router.put('/:id', requireRole('ADMIN'), ctrl.update);
router.delete('/:id', requireRole('ADMIN'), ctrl.remove);

// Stok hareketleri
router.get('/:id/transactions', txCtrl.list);
router.post('/:id/transactions', requireRole('ADMIN', 'MANAGER'), txCtrl.create);

export default router;
