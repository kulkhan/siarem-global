import { Router } from 'express';
import { login, loginValidation, getMe, logout } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.post('/login', loginValidation, login);
router.get('/me', authenticate, getMe);
router.post('/logout', authenticate, logout);

export default router;
