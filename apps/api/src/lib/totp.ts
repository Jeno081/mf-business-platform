import { createHash, randomBytes } from 'node:crypto';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import { env } from '../config/env';

authenticator.options = { window: 1 };

export function generateTotpSecret(): string {
  return authenticator.generateSecret();
}

export function buildTotpUri(secret: string, email: string): string {
  return authenticator.keyuri(email, env.ADMIN_2FA_ISSUER, secret);
}

export async function buildTotpQrCode(uri: string): Promise<string> {
  return QRCode.toDataURL(uri, {
    margin: 1,
    width: 260,
    color: { dark: '#0f0f0f', light: '#fcfaf5' },
  });
}

export function verifyTotp(code: string, secret: string): boolean {
  try {
    return authenticator.check(code.replace(/\s/g, ''), secret);
  } catch {
    return false;
  }
}

export function generateRecoveryCodes(count = 8): string[] {
  return Array.from({ length: count }, () => {
    const raw = randomBytes(4).toString('hex').toUpperCase();
    return `${raw.slice(0, 4)}-${raw.slice(4, 8)}`;
  });
}

export function hashRecoveryCode(code: string): string {
  return createHash('sha256').update(code.replace(/-/g, '').toUpperCase()).digest('hex');
}
