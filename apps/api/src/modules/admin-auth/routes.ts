import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from '../../config/env';
import { asyncHandler } from '../../lib/async-handler';
import { clearRefreshCookie, setRefreshCookie } from '../../lib/cookies';
import { requireAdmin, requireAuth } from '../../middlewares/auth';
import { AppError } from '../../middlewares/error-handler';
import { verifyPurposeToken } from '../../lib/tokens';
import { adminLoginSchema, disableSchema, enableSchema, setupSchema } from './schemas';
import {
  adminLogin,
  beginTwoFactorSetup,
  disableTwoFactor,
  enableTwoFactorSetup,
  getAdminMe,
  rotateAdminRefresh,
} from './service';
import { revokeRefresh, type SessionResult } from '../auth/service';

const COOKIE_NAME = 'mf_admin_refresh';
const COOKIE_PATH = '/api/v1/admin/auth';

const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Trop de tentatives administrateur. Réessayez plus tard.',
    },
  },
});

function sendAdminSession(
  res: Parameters<typeof setRefreshCookie>[0],
  session: SessionResult,
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

export const adminAuthRouter = Router();

adminAuthRouter.post(
  '/login',
  adminLimiter,
  asyncHandler(async (req, res) => {
    const input = adminLoginSchema.parse(req.body);
    const result = await adminLogin(input, req);

    if ('requiresTwoFactorSetup' in result) {
      res.status(200).json(result);
      return;
    }

    sendAdminSession(res, result);
  }),
);

adminAuthRouter.post(
  '/2fa/setup',
  adminLimiter,
  asyncHandler(async (req, res) => {
    const input = setupSchema.parse(req.body);
    const payload = verifyPurposeToken(input.setupToken, '2fa_setup');
    const setup = await beginTwoFactorSetup(payload.sub);
    res.json(setup);
  }),
);

adminAuthRouter.post(
  '/2fa/enable',
  adminLimiter,
  asyncHandler(async (req, res) => {
    const input = enableSchema.parse(req.body);
    const result = await enableTwoFactorSetup(input.setupToken, input.code, req);

    setRefreshCookie(res, COOKIE_NAME, result.refreshToken, {
      path: COOKIE_PATH,
      days: env.JWT_REFRESH_DAYS,
    });

    res.status(201).json({
      accessToken: result.accessToken,
      expiresIn: env.JWT_ACCESS_TTL,
      user: result.user,
      recoveryCodes: result.recoveryCodes,
    });
  }),
);

adminAuthRouter.post(
  '/2fa/disable',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const input = disableSchema.parse(req.body);
    await disableTwoFactor(req.auth!.userId, input.password, input.code, req);
    clearRefreshCookie(res, COOKIE_NAME, COOKIE_PATH);
    res.status(204).send();
  }),
);

adminAuthRouter.post(
  '/refresh',
  adminLimiter,
  asyncHandler(async (req, res) => {
    const raw = req.cookies?.[COOKIE_NAME] as string | undefined;
    if (!raw) {
      throw new AppError('Aucune session administrateur active.', 401, 'NO_REFRESH_TOKEN');
    }
    const session = await rotateAdminRefresh(raw, req);
    sendAdminSession(res, session);
  }),
);

adminAuthRouter.post(
  '/logout',
  asyncHandler(async (req, res) => {
    const raw = req.cookies?.[COOKIE_NAME] as string | undefined;
    await revokeRefresh(raw);
    clearRefreshCookie(res, COOKIE_NAME, COOKIE_PATH);
    res.status(204).send();
  }),
);

adminAuthRouter.get(
  '/me',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const user = await getAdminMe(req.auth!.userId);
    res.json({ user });
  }),
);
