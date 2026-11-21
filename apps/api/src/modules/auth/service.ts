import type { Request } from 'express';
import { prisma, type UserRole } from '@mf/database';
import { hashPassword, verifyPassword } from '../../lib/password';
import {
  createRefreshToken,
  hashToken,
  signAccessToken,
} from '../../lib/tokens';
import { AppError } from '../../middlewares/error-handler';
import type { ChangePasswordInput, LoginInput, RegisterInput } from './schemas';

const publicUserSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  role: true,
  status: true,
  createdAt: true,
} as const;

export interface PublicUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  role: UserRole;
  status: string;
  createdAt: Date;
}

export interface SessionResult {
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
  user: PublicUser;
}

function requestMetadata(req: Request) {
  return {
    userAgent: req.get('user-agent')?.slice(0, 255) ?? null,
    ipAddress: req.ip ?? req.socket.remoteAddress ?? null,
  };
}

export async function createSession(user: PublicUser, req: Request): Promise<SessionResult> {
  const refresh = createRefreshToken();
  const metadata = requestMetadata(req);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: refresh.hash,
      familyId: refresh.familyId,
      expiresAt: refresh.expiresAt,
      userAgent: metadata.userAgent,
      ipAddress: metadata.ipAddress,
    },
  });

  return {
    accessToken: signAccessToken(user.id, user.role),
    refreshToken: refresh.raw,
    refreshExpiresAt: refresh.expiresAt,
    user,
  };
}

export async function register(input: RegisterInput, req: Request): Promise<SessionResult> {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new AppError('Un compte existe déjà avec cette adresse e-mail.', 409, 'EMAIL_ALREADY_USED');
  }

  const passwordHash = await hashPassword(input.password);

  try {
    const user = await prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        firstName: input.firstName ?? null,
        lastName: input.lastName ?? null,
        phone: input.phone ?? null,
        role: 'CUSTOMER',
      },
      select: publicUserSelect,
    });

    return createSession(user, req);
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
      throw new AppError('Cette adresse e-mail ou ce téléphone est déjà utilisé.', 409, 'ALREADY_USED');
    }
    throw error;
  }
}

export async function login(input: LoginInput, req: Request): Promise<SessionResult> {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    select: { ...publicUserSelect, passwordHash: true },
  });

  if (!user?.passwordHash || user.status !== 'ACTIVE') {
    throw new AppError('E-mail ou mot de passe incorrect.', 401, 'INVALID_CREDENTIALS');
  }

  if (user.role !== 'CUSTOMER') {
    throw new AppError(
      'Utilisez la connexion administrateur pour ce compte.',
      403,
      'USE_ADMIN_LOGIN',
    );
  }

  const valid = await verifyPassword(input.password, user.passwordHash);
  if (!valid) {
    throw new AppError('E-mail ou mot de passe incorrect.', 401, 'INVALID_CREDENTIALS');
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const { passwordHash: _passwordHash, ...publicUser } = user;
  return createSession(publicUser, req);
}

export async function rotateRefresh(rawToken: string, req: Request): Promise<SessionResult> {
  const tokenHash = hashToken(rawToken);
  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: {
      user: { select: { ...publicUserSelect } },
    },
  });

  if (!stored || stored.expiresAt.getTime() <= Date.now()) {
    throw new AppError('Session expirée. Veuillez vous reconnecter.', 401, 'REFRESH_EXPIRED');
  }

  if (stored.revokedAt) {
    await prisma.refreshToken.updateMany({
      where: { familyId: stored.familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    throw new AppError('Réutilisation de session détectée. Reconnectez-vous.', 401, 'REFRESH_REUSE');
  }

  if (stored.user.status !== 'ACTIVE') {
    throw new AppError('Compte indisponible.', 401, 'ACCOUNT_UNAVAILABLE');
  }

  const next = createRefreshToken();
  const metadata = requestMetadata(req);

  await prisma.$transaction([
    prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date(), replacedBy: next.hash },
    }),
    prisma.refreshToken.create({
      data: {
        userId: stored.userId,
        tokenHash: next.hash,
        familyId: stored.familyId,
        expiresAt: next.expiresAt,
        userAgent: metadata.userAgent,
        ipAddress: metadata.ipAddress,
      },
    }),
  ]);

  return {
    accessToken: signAccessToken(stored.user.id, stored.user.role),
    refreshToken: next.raw,
    refreshExpiresAt: next.expiresAt,
    user: stored.user,
  };
}

export async function revokeRefresh(rawToken: string | undefined): Promise<void> {
  if (!rawToken) return;
  await prisma.refreshToken.updateMany({
    where: { tokenHash: hashToken(rawToken), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function revokeAllSessions(userId: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function getPublicUser(userId: string): Promise<PublicUser> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: publicUserSelect,
  });

  if (!user || user.status !== 'ACTIVE') {
    throw new AppError('Compte indisponible.', 401, 'ACCOUNT_UNAVAILABLE');
  }

  return user;
}

export async function changePassword(
  userId: string,
  input: ChangePasswordInput,
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });

  if (!user?.passwordHash) {
    throw new AppError('Compte sans mot de passe.', 400, 'NO_PASSWORD');
  }

  const valid = await verifyPassword(input.currentPassword, user.passwordHash);
  if (!valid) {
    throw new AppError('Mot de passe actuel incorrect.', 401, 'INVALID_CURRENT_PASSWORD');
  }

  const passwordHash = await hashPassword(input.newPassword);
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
    prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);
}
