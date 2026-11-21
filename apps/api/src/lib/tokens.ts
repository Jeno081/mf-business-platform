import { createHash, randomBytes, randomUUID } from 'node:crypto';
import jwt, { type SignOptions } from 'jsonwebtoken';
import type { UserRole } from '@mf/database';
import { env } from '../config/env';
import { AppError } from '../middlewares/error-handler';

const ISSUER = 'mf-business';
const AUDIENCE = 'mf-web';

export interface AccessTokenPayload {
  sub: string;
  role: UserRole;
  type: 'access';
}

export interface PurposeTokenPayload {
  sub: string;
  type: string;
}

const accessOptions: SignOptions = {
  expiresIn: env.JWT_ACCESS_TTL as SignOptions['expiresIn'],
  issuer: ISSUER,
  audience: AUDIENCE,
};

export function signAccessToken(userId: string, role: UserRole): string {
  return jwt.sign({ role, type: 'access' }, env.JWT_ACCESS_SECRET, {
    ...accessOptions,
    subject: userId,
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET, {
      issuer: ISSUER,
      audience: AUDIENCE,
    });

    if (
      typeof payload === 'string' ||
      payload.type !== 'access' ||
      typeof payload.sub !== 'string' ||
      typeof payload.role !== 'string'
    ) {
      throw new Error('Payload invalide');
    }

    return {
      sub: payload.sub,
      role: payload.role as UserRole,
      type: 'access',
    };
  } catch {
    throw new AppError('Session expirée ou invalide.', 401, 'INVALID_ACCESS_TOKEN');
  }
}

export function signPurposeToken(userId: string, purpose: string, expiresIn = '15m'): string {
  return jwt.sign({ type: purpose }, env.JWT_REFRESH_SECRET, {
    subject: userId,
    expiresIn: expiresIn as SignOptions['expiresIn'],
    issuer: ISSUER,
    audience: AUDIENCE,
  });
}

export function verifyPurposeToken(token: string, purpose: string): PurposeTokenPayload {
  try {
    const payload = jwt.verify(token, env.JWT_REFRESH_SECRET, {
      issuer: ISSUER,
      audience: AUDIENCE,
    });

    if (typeof payload === 'string' || payload.type !== purpose || typeof payload.sub !== 'string') {
      throw new Error('Payload invalide');
    }

    return { sub: payload.sub, type: payload.type };
  } catch {
    throw new AppError('Jeton de vérification invalide ou expiré.', 401, 'INVALID_SETUP_TOKEN');
  }
}

export function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

export function createRefreshToken(): {
  raw: string;
  hash: string;
  familyId: string;
  expiresAt: Date;
} {
  const raw = randomBytes(48).toString('base64url');
  const familyId = randomUUID();
  const expiresAt = new Date(Date.now() + env.JWT_REFRESH_DAYS * 24 * 60 * 60 * 1000);

  return { raw, hash: hashToken(raw), familyId, expiresAt };
}
