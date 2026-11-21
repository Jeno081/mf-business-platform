import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from '../../config/env';
import { asyncHandler } from '../../lib/async-handler';
import { clearRefreshCookie, setRefreshCookie } from '../../lib/cookies';
import { requireAuth } from '../../middlewares/auth';
import { AppError } from '../../middlewares/error-handler';
import { changePasswordSchema, loginSchema, registerSchema } from './schemas';
import {
  changePassword,
  getPublicUser,
  login,
  register,
  revokeRefresh,
  rotateRefresh,
} from './service';

const COOKIE_NAME = 'mf_refresh';
const COOKIE_PATH = '/api/v1/auth';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Trop de tentatives. Réessayez dans quelques minutes.',
    },
  },
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

function sendSession(
  res: Parameters<typeof setRefreshCookie>[0],
  session: Awaited<ReturnType<typeof login>>,
  status = 200,
): void {
  setRefreshCookie(res, COOKIE_NAME, session.refreshToken, {
    path: COOKIE_PATH,
    days: env.JWT_REFRESH_DAYS,
  });

  res.status(status).json({
    accessToken: session.accessToken,
    expiresIn: env.JWT_ACCESS_TTL,
    user: session.user,
  });
}

export const authRouter = Router();

authRouter.post(
  '/register',
  registerLimiter,
  asyncHandler(async (req, res) => {
    const input = registerSchema.parse(req.body);
    const session = await register(input, req);
    sendSession(res, session, 201);
  }),
);

authRouter.post(
  '/login',
  authLimiter,
  asyncHandler(async (req, res) => {
    const input = loginSchema.parse(req.body);
    const session = await login(input, req);
    sendSession(res, session);
  }),
);

authRouter.post(
  '/refresh',
  authLimiter,
  asyncHandler(async (req, res) => {
    const raw = req.cookies?.[COOKIE_NAME] as string | undefined;
    if (!raw) {
      throw new AppError('Aucune session active.', 401, 'NO_REFRESH_TOKEN');
    }
    const session = await rotateRefresh(raw, req);
    sendSession(res, session);
  }),
);

authRouter.post(
  '/logout',
  asyncHandler(async (req, res) => {
    const raw = req.cookies?.[COOKIE_NAME] as string | undefined;
    await revokeRefresh(raw);
    clearRefreshCookie(res, COOKIE_NAME, COOKIE_PATH);
    res.status(204).send();
  }),
);

authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await getPublicUser(req.auth!.userId);
    res.json({ user });
  }),
);

authRouter.post(
  '/change-password',
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = changePasswordSchema.parse(req.body);
    await changePassword(req.auth!.userId, input);
    clearRefreshCookie(res, COOKIE_NAME, COOKIE_PATH);
    res.status(204).send();
  }),
);
