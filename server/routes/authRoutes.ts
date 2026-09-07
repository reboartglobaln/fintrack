import { Router } from 'express';
import {
  register,
  login,
  getMe,
  forgotPassword,
  resetPassword,
  updateCurrency,
  logout,
} from '../controllers/authController';
import {
  getGoogleAuthUrl,
  handleGoogleCredential,
  handleGoogleMockLogin,
} from '../controllers/googleAuthController';
import { authenticateJWT } from '../middleware/auth';
import { authRateLimiter } from '../middleware/rateLimiter';
import { validateRegister, validateLogin } from '../middleware/validator';

const router = Router();

// Public routes
router.post('/register', authRateLimiter, validateRegister, register);
router.post('/login', authRateLimiter, validateLogin, login);
router.post('/forgot-password', authRateLimiter, forgotPassword);
router.post('/reset-password', authRateLimiter, resetPassword);
router.post('/logout', logout);

// Google Authentication routes
router.get('/google/url', getGoogleAuthUrl);
router.post('/google/credential', handleGoogleCredential);
router.post('/google/mock-login', handleGoogleMockLogin);

// Protected routes
router.get('/me', authenticateJWT, getMe);
router.patch('/currency', authenticateJWT, updateCurrency);

export default router;
