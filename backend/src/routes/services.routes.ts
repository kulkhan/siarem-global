import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import * as ctrl from '../controllers/services.controller';
import * as reportCtrl from '../controllers/serviceReport.controller';
import * as invoiceCtrl from '../controllers/invoices.controller';

const router = Router();
router.use(authenticate);

router.get('/types', ctrl.types);
router.get('/', ctrl.list);
router.get('/:id', ctrl.getOne);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

// Service report endpoints
router.get('/:id/report', reportCtrl.getReport);
router.put('/:id/report', reportCtrl.upsertReport);

// Convert service to draft invoice
router.post('/:id/convert-to-invoice', invoiceCtrl.convertFromService);

export default router;
