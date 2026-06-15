import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import * as ctrl from '../controllers/emailConfig.controller';

const router = Router();
router.use(authenticate);
router.use(requireRole('ADMIN', 'MANAGER'));

router.get('/config', ctrl.getConfig);
router.put('/config', ctrl.saveConfig);
router.post('/config/test', ctrl.testConfig);

router.post('/config/rules', ctrl.createRule);
router.put('/config/rules/:ruleId', ctrl.updateRule);
router.delete('/config/rules/:ruleId', ctrl.deleteRule);

router.get('/logs', ctrl.getLogs);

export default router;
