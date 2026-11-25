import type { AuthContext } from '../types/auth';

declare global {
  namespace Express {
    interface Request {
      id?: string;
      auth?: AuthContext;
      chatGuestId?: string;
    }
  }
}

export {};
