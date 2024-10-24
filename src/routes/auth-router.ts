import express from 'express';
import {
  appleAuth,
  authorizeNew,
  emailVerification,
  forgotPassword,
  forgotPasswordReset,
  googleAuth,
  login,
  loginNew,
  refreshTokensNew,
  register,
  resetPassword,
  tokenVerification,
  verifyEmail,
  verifyForgotPassword,
} from '../controllers/auth-controller';
import { verifyTokens } from '../middleware/jwt';
import { forgotPasswordLimiter, loginLimiter, sendEmailCodeLimiter } from '../middleware/rate-limit';
const authRouter = express.Router();

authRouter.get('/authorize-new', authorizeNew);

authRouter.get('/refresh-tokens', refreshTokensNew);

authRouter.post('/register', register);

authRouter.post('/email-verification', sendEmailCodeLimiter, emailVerification);

authRouter.post('/email-verification/verify', verifyEmail);

authRouter.post('/login', loginLimiter, login);

authRouter.post('/login-new', loginLimiter, loginNew);

authRouter.get('/verify-tokens', verifyTokens, tokenVerification);

authRouter.patch('/reset-password', verifyTokens, resetPassword);

authRouter.post('/forgot-password', forgotPasswordLimiter, forgotPassword);

authRouter.post('/forgot-password/verify', verifyForgotPassword);

authRouter.patch('/forgot-password/reset', forgotPasswordReset);

authRouter.post('/apple-auth', appleAuth);

authRouter.post('/google-auth', googleAuth);

export default authRouter;
