import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import * as ctrl from '../controllers/tasks.controller';

const router = Router();
router.use(authenticate);

router.get('/categories', ctrl.getCategories);
router.get('/', ctrl.list);
router.get('/:id', ctrl.getOne);
router.post('/', ctrl.create);
router.post('/:id/close', ctrl.close);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

export default router;
