import { randomUUID } from 'node:crypto';
import { signPurposeToken, verifyPurposeToken } from './tokens';
import { AppError } from '../middlewares/error-handler';

const GUEST_PURPOSE = 'chat_guest';
const GUEST_TTL = '365d';

export function createGuestId(): string {
  return randomUUID();
}

export function signGuestToken(guestId: string): string {
  return signPurposeToken(guestId, GUEST_PURPOSE, GUEST_TTL);
}

export function verifyGuestToken(token: string): string {
  try {
    return verifyPurposeToken(token, GUEST_PURPOSE).sub;
  } catch {
    throw new AppError('Session de chat invalide ou expirée.', 401, 'CHAT_TOKEN_INVALID');
  }
}
