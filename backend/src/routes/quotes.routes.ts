import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import * as ctrl from '../controllers/quotes.controller';
import * as invoiceCtrl from '../controllers/invoices.controller';

const router = Router();
router.use(authenticate);

router.get('/', ctrl.list);
router.get('/:id', ctrl.getOne);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

// Convert a quote to a new service (preferred flow)
router.post('/:id/convert-to-service', ctrl.convertToService);

// Convert a quote directly to a draft invoice (legacy)
router.post('/:id/convert-to-invoice', invoiceCtrl.convertFromQuote);

export default router;
