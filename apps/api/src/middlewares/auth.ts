import type { NextFunction, Request, Response } from 'express';
import { prisma } from '@mf/database';
import { verifyAccessToken } from '../lib/tokens';
import { AppError } from '../middlewares/error-handler';
import { ADMIN_ROLES, isAdminRole } from '../types/auth';

function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return null;
  }
  return header.slice('Bearer '.length).trim() || null;
}

export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      throw new AppError('Authentification requise.', 401, 'AUTH_REQUIRED');
    }

    const payload = verifyAccessToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, status: true },
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new AppError('Compte indisponible.', 401, 'ACCOUNT_UNAVAILABLE');
    }

    req.auth = { userId: user.id, email: user.email, role: user.role };
    next();
  } catch (error) {
    next(error);
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.auth) {
      next(new AppError('Authentification requise.', 401, 'AUTH_REQUIRED'));
      return;
    }
    if (!roles.includes(req.auth.role)) {
      next(new AppError('Accès refusé.', 403, 'FORBIDDEN'));
      return;
    }
    next();
  };
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.auth) {
    next(new AppError('Authentification administrateur requise.', 401, 'AUTH_REQUIRED'));
    return;
  }
  if (!isAdminRole(req.auth.role)) {
    next(new AppError('Accès administrateur requis.', 403, 'ADMIN_REQUIRED'));
    return;
  }
  next();
}

export const adminRoleList = ADMIN_ROLES;
