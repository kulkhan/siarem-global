import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { list, getOne, create, update, remove, shipTypeList, flagOptions } from '../controllers/ships.controller';

const router = Router();
router.use(authenticate);

router.get('/types', shipTypeList);
router.get('/options/flags', flagOptions);
router.get('/', list);
router.get('/:id', getOne);
router.post('/', create);
router.put('/:id', update);
router.delete('/:id', remove);

export default router;
