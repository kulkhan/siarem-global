import { Router } from 'express';
import { login, loginValidation, getMe, logout, register } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.post('/login', loginValidation, login);
router.post('/register', register);  // public: self-signup
router.get('/me', authenticate, getMe);
router.post('/logout', authenticate, logout);

export default router;
