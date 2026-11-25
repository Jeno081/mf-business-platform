import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { asyncHandler } from '../../lib/async-handler';
import { emitChatMessage, emitConversationUpdated } from '../../lib/chat-realtime';
import { requireAdmin, requireAuth } from '../../middlewares/auth';
import {
  adminChatListQuerySchema,
  adminChatUpdateSchema,
  chatConversationIdSchema,
  chatMessageSchema,
} from './schemas';
import {
  getAdminConversation,
  listAdminConversations,
  markAdminRead,
  sendAdminMessage,
  updateAdminConversation,
} from './service';

const adminMessageLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
});

export const adminChatRouter = Router();

adminChatRouter.use(requireAuth, requireAdmin);

adminChatRouter.get(
  '/conversations',
  asyncHandler(async (req, res) => {
    const query = adminChatListQuerySchema.parse(req.query);
    res.json(await listAdminConversations(query));
  }),
);

adminChatRouter.get(
  '/conversations/:id',
  asyncHandler(async (req, res) => {
    const { id } = chatConversationIdSchema.parse(req.params);
    res.json({ data: await getAdminConversation(id) });
  }),
);

adminChatRouter.post(
  '/conversations/:id/messages',
  adminMessageLimiter,
  asyncHandler(async (req, res) => {
    const { id } = chatConversationIdSchema.parse(req.params);
    const input = chatMessageSchema.parse(req.body);
    const message = await sendAdminMessage(id, req.auth!.userId, input.body);
    emitChatMessage(message);
    emitConversationUpdated(id, { lastMessageAt: message.createdAt });
    res.status(201).json({ data: message });
  }),
);

adminChatRouter.post(
  '/conversations/:id/read',
  asyncHandler(async (req, res) => {
    const { id } = chatConversationIdSchema.parse(req.params);
    res.json({ data: await markAdminRead(id) });
  }),
);

adminChatRouter.patch(
  '/conversations/:id',
  asyncHandler(async (req, res) => {
    const { id } = chatConversationIdSchema.parse(req.params);
    const input = adminChatUpdateSchema.parse(req.body);
    const conversation = await updateAdminConversation(id, input);
    emitConversationUpdated(id, { status: conversation.status });
    res.json({ data: conversation });
  }),
);
