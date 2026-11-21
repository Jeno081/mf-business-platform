import type { Response } from 'express';
import { env } from '../config/env';

interface CookieOptions {
  path: string;
  days: number;
}

function baseOptions(path: string) {
  return {
    httpOnly: true,
    secure: env.isProduction || env.COOKIE_SAME_SITE === 'none',
    sameSite: env.COOKIE_SAME_SITE,
    path,
    ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
  } as const;
}

export function setRefreshCookie(
  res: Response,
  name: string,
  token: string,
  options: CookieOptions,
): void {
  res.cookie(name, token, {
    ...baseOptions(options.path),
    maxAge: options.days * 24 * 60 * 60 * 1000,
  });
}

export function clearRefreshCookie(res: Response, name: string, path: string): void {
  res.clearCookie(name, baseOptions(path));
}
