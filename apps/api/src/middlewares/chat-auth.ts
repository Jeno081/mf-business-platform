import type { NextFunction, Request, Response } from 'express';
import { verifyGuestToken } from '../lib/chat-tokens';
import { AppError } from './error-handler';

export function requireChatGuest(req: Request, _res: Response, next: NextFunction): void {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new AppError('Session de chat requise.', 401, 'CHAT_AUTH_REQUIRED');
    }
    req.chatGuestId = verifyGuestToken(header.slice('Bearer '.length).trim());
    next();
  } catch (error) {
    next(error);
  }
}
