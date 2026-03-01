import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { login, loginValidation, getMe, logout, register } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Brute-force koruması: login 15 dakikada en fazla 10 deneme
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts, please try again later.' },
});

// Spam koruması: register 1 saatte en fazla 5 deneme
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many registration attempts, please try again later.' },
});

router.post('/login', loginLimiter, loginValidation, login);
router.post('/register', registerLimiter, register);  // public: self-signup
router.get('/me', authenticate, getMe);
router.post('/logout', authenticate, logout);

export default router;
