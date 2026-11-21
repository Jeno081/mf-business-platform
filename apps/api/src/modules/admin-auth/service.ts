import type { Request } from 'express';
import { prisma, type UserRole } from '@mf/database';
import { hashPassword, verifyPassword } from '../../lib/password';
import {
  buildTotpQrCode,
  buildTotpUri,
  generateRecoveryCodes,
  generateTotpSecret,
  hashRecoveryCode,
  verifyTotp,
} from '../../lib/totp';
import { signPurposeToken, verifyPurposeToken } from '../../lib/tokens';
import { writeAuditLog } from '../../lib/audit';
import { AppError } from '../../middlewares/error-handler';
import { ADMIN_ROLES, isAdminRole } from '../../types/auth';
import { createSession, revokeAllSessions, rotateRefresh, type PublicUser, type SessionResult } from '../auth/service';
import type { AdminLoginInput } from './schemas';

const adminSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  role: true,
  status: true,
  createdAt: true,
  passwordHash: true,
  twoFactorEnabled: true,
  twoFactorSecret: true,
  twoFactorRecoveryCodes: true,
} as const;

type AdminUser = PublicUser & {
  passwordHash: string | null;
  twoFactorEnabled: boolean;
  twoFactorSecret: string | null;
  twoFactorRecoveryCodes: unknown;
};

export type AdminLoginResult =
  | { requiresTwoFactorSetup: true; setupToken: string }
  | SessionResult;

function adminRoles(): UserRole[] {
  return [...ADMIN_ROLES] as UserRole[];
}

async function findAdminByEmail(email: string): Promise<AdminUser | null> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: adminSelect,
  });

  if (!user || !isAdminRole(user.role) || user.status !== 'ACTIVE') {
    return null;
  }

  return user;
}

async function getAdminById(userId: string): Promise<AdminUser> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: adminSelect,
  });

  if (!user || !isAdminRole(user.role) || user.status !== 'ACTIVE') {
    throw new AppError('Compte administrateur indisponible.', 401, 'ADMIN_UNAVAILABLE');
  }

  return user;
}

function withoutSecrets(user: AdminUser): PublicUser {
  const { passwordHash: _p, twoFactorEnabled: _e, twoFactorSecret: _s, twoFactorRecoveryCodes: _r, ...publicUser } = user;
  return publicUser;
}

export async function adminLogin(input: AdminLoginInput, req: Request): Promise<AdminLoginResult> {
  const user = await findAdminByEmail(input.email);
  if (!user?.passwordHash) {
    throw new AppError('E-mail ou mot de passe incorrect.', 401, 'INVALID_CREDENTIALS');
  }

  const valid = await verifyPassword(input.password, user.passwordHash);
  if (!valid) {
    throw new AppError('E-mail ou mot de passe incorrect.', 401, 'INVALID_CREDENTIALS');
  }

  if (!user.twoFactorEnabled) {
    await writeAuditLog({
      actorId: user.id,
      action: 'ADMIN_2FA_SETUP_REQUESTED',
      entityType: 'User',
      entityId: user.id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    return {
      requiresTwoFactorSetup: true,
      setupToken: signPurposeToken(user.id, '2fa_setup', '15m'),
    };
  }

  if (!user.twoFactorSecret) {
    throw new AppError('Configuration 2FA incomplète. Contactez un super administrateur.', 409, 'TWO_FACTOR_BROKEN');
  }

  let verified = false;
  let usedRecoveryCode = false;

  if (input.totp) {
    verified = verifyTotp(input.totp, user.twoFactorSecret);
  }

  if (!verified && input.recoveryCode) {
    const hashes = Array.isArray(user.twoFactorRecoveryCodes)
      ? (user.twoFactorRecoveryCodes as string[])
      : [];
    const candidate = hashRecoveryCode(input.recoveryCode);
    if (hashes.includes(candidate)) {
      verified = true;
      usedRecoveryCode = true;
      await prisma.user.update({
        where: { id: user.id },
        data: {
          twoFactorRecoveryCodes: hashes.filter((hash) => hash !== candidate),
        },
      });
    }
  }

  if (!verified) {
    throw new AppError('Code de vérification requis ou invalide.', 401, 'TWO_FACTOR_REQUIRED', {
      requiresTwoFactor: true,
    });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  await writeAuditLog({
    actorId: user.id,
    action: usedRecoveryCode ? 'ADMIN_LOGIN_RECOVERY_CODE' : 'ADMIN_LOGIN_SUCCESS',
    entityType: 'User',
    entityId: user.id,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });

  return createSession(withoutSecrets(user), req);
}

export async function beginTwoFactorSetup(userId: string): Promise<{
  secret: string;
  otpauthUrl: string;
  qrCodeDataUrl: string;
}> {
  const user = await getAdminById(userId);
  if (user.twoFactorEnabled) {
    throw new AppError('La double authentification est déjà activée.', 409, 'TWO_FACTOR_ALREADY_ENABLED');
  }

  const secret = generateTotpSecret();
  await prisma.user.update({
    where: { id: user.id },
    data: { twoFactorSecret: secret, twoFactorEnabled: false },
  });

  const otpauthUrl = buildTotpUri(secret, user.email);
  return {
    secret,
    otpauthUrl,
    qrCodeDataUrl: await buildTotpQrCode(otpauthUrl),
  };
}

export async function enableTwoFactorSetup(
  setupToken: string,
  code: string,
  req: Request,
): Promise<SessionResult & { recoveryCodes: string[] }> {
  const payload = verifyPurposeToken(setupToken, '2fa_setup');
  const user = await getAdminById(payload.sub);

  if (user.twoFactorEnabled) {
    throw new AppError('La double authentification est déjà activée.', 409, 'TWO_FACTOR_ALREADY_ENABLED');
  }

  if (!user.twoFactorSecret) {
    throw new AppError('Commencez par générer le QR code.', 409, 'TWO_FACTOR_NOT_STARTED');
  }

  if (!verifyTotp(code, user.twoFactorSecret)) {
    throw new AppError('Code invalide. Vérifiez l’heure de votre téléphone.', 401, 'INVALID_TOTP');
  }

  const recoveryCodes = generateRecoveryCodes();
  const hashes = recoveryCodes.map(hashRecoveryCode);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      twoFactorEnabled: true,
      twoFactorRecoveryCodes: hashes,
    },
  });

  await writeAuditLog({
    actorId: user.id,
    action: 'ADMIN_2FA_ENABLED',
    entityType: 'User',
    entityId: user.id,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });

  const session = await createSession(withoutSecrets(user), req);
  return { ...session, recoveryCodes };
}

export async function disableTwoFactor(
  userId: string,
  password: string,
  code: string,
  req: Request,
): Promise<void> {
  const user = await getAdminById(userId);
  if (!user.passwordHash || !user.twoFactorSecret) {
    throw new AppError('Double authentification non configurée.', 409, 'TWO_FACTOR_NOT_ENABLED');
  }

  const validPassword = await verifyPassword(password, user.passwordHash);
  if (!validPassword) {
    throw new AppError('Mot de passe incorrect.', 401, 'INVALID_PASSWORD');
  }

  if (!verifyTotp(code, user.twoFactorSecret)) {
    throw new AppError('Code invalide.', 401, 'INVALID_TOTP');
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      twoFactorEnabled: false,
      twoFactorSecret: null,
      twoFactorRecoveryCodes: [],
    },
  });
  await revokeAllSessions(user.id);

  await writeAuditLog({
    actorId: user.id,
    action: 'ADMIN_2FA_DISABLED',
    entityType: 'User',
    entityId: user.id,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });
}

export async function rotateAdminRefresh(raw: string, req: Request): Promise<SessionResult> {
  const session = await rotateRefresh(raw, req);
  if (!isAdminRole(session.user.role)) {
    await revokeAllSessions(session.user.id);
    throw new AppError('Session administrateur invalide.', 401, 'ADMIN_REQUIRED');
  }
  return session;
}

export async function getAdminMe(userId: string): Promise<PublicUser> {
  return withoutSecrets(await getAdminById(userId));
}

export async function createAdminAccount(input: {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}): Promise<PublicUser> {
  const passwordHash = await hashPassword(input.password);
  const existing = await prisma.user.findUnique({ where: { email: input.email } });

  if (existing) {
    const updated = await prisma.user.update({
      where: { id: existing.id },
      data: {
        passwordHash,
        role: 'SUPER_ADMIN',
        status: 'ACTIVE',
        firstName: input.firstName ?? existing.firstName,
        lastName: input.lastName ?? existing.lastName,
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorRecoveryCodes: [],
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });
    return updated;
  }

  return prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      firstName: input.firstName ?? null,
      lastName: input.lastName ?? null,
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      role: true,
      status: true,
      createdAt: true,
    },
  });
}
