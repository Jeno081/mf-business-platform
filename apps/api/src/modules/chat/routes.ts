import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { asyncHandler } from '../../lib/async-handler';
import { emitChatMessage } from '../../lib/chat-realtime';
import { requireChatGuest } from '../../middlewares/chat-auth';
import {
  chatConversationIdSchema,
  chatMessageSchema,
  chatMessagesQuerySchema,
} from './schemas';
import {
  createGuestSession,
  getGuestConversation,
  getGuestMessages,
  markGuestRead,
  sendGuestMessage,
} from './service';

const sessionLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

const messageLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

export const chatRouter = Router();

chatRouter.post(
  '/session',
  sessionLimiter,
  asyncHandler(async (req, res) => {
    const header = req.headers.authorization;
    const token = header?.startsWith('Bearer ')
      ? header.slice('Bearer '.length).trim()
      : undefined;
    res.json({ data: await createGuestSession(token) });
  }),
);

chatRouter.post(
  '/conversations',
  sessionLimiter,
  asyncHandler(async (req, res) => {
    const header = req.headers.authorization;
    const token = header?.startsWith('Bearer ')
      ? header.slice('Bearer '.length).trim()
      : undefined;
    res.json({ data: await createGuestSession(token) });
  }),
);

chatRouter.get(
  '/conversations/:id',
  requireChatGuest,
  asyncHandler(async (req, res) => {
    const { id } = chatConversationIdSchema.parse(req.params);
    res.json({ data: await getGuestConversation(id, req.chatGuestId!) });
  }),
);

chatRouter.get(
  '/conversations/:id/messages',
  requireChatGuest,
  asyncHandler(async (req, res) => {
    const { id } = chatConversationIdSchema.parse(req.params);
    const query = chatMessagesQuerySchema.parse(req.query);
    res.json({ data: await getGuestMessages(id, req.chatGuestId!, query.limit) });
  }),
);

chatRouter.post(
  '/conversations/:id/messages',
  requireChatGuest,
  messageLimiter,
  asyncHandler(async (req, res) => {
    const { id } = chatConversationIdSchema.parse(req.params);
    const input = chatMessageSchema.parse(req.body);
    const message = await sendGuestMessage(id, req.chatGuestId!, input.body);
    emitChatMessage(message);
    res.status(201).json({ data: message });
  }),
);

chatRouter.post(
  '/conversations/:id/read',
  requireChatGuest,
  asyncHandler(async (req, res) => {
    const { id } = chatConversationIdSchema.parse(req.params);
    res.json({ data: await markGuestRead(id, req.chatGuestId!) });
  }),
);
