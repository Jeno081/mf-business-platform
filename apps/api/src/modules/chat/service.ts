import { prisma, Prisma, type SenderType } from '@mf/database';
import { AppError } from '../../middlewares/error-handler';
import { createGuestId, signGuestToken, verifyGuestToken } from '../../lib/chat-tokens';
import type { AdminChatListQuery, AdminChatUpdateInput } from './schemas';
import {
  notifyAdminNewChat,
  notifyCustomerNewChatReply,
} from '../push/service';

const messageSelect = {
  id: true,
  conversationId: true,
  senderId: true,
  senderType: true,
  body: true,
  attachments: true,
  readAt: true,
  createdAt: true,
} satisfies Prisma.MessageSelect;

type MessageRow = Prisma.MessageGetPayload<{ select: typeof messageSelect }>;

const conversationLastMessage = {
  messages: {
    orderBy: { createdAt: 'desc' as const },
    take: 1,
    select: messageSelect,
  },
} satisfies Prisma.ConversationInclude;

type ConversationWithLast = Prisma.ConversationGetPayload<{
  include: typeof conversationLastMessage;
}>;

export interface ChatMessageDto {
  id: string;
  conversationId: string;
  senderId: string | null;
  senderType: SenderType;
  body: string;
  attachments: unknown;
  readAt: string | null;
  createdAt: string;
}

export interface ChatConversationDto {
  id: string;
  status: string;
  guestLabel: string;
  assignedAdminId: string | null;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string | null;
  lastMessage: ChatMessageDto | null;
  unreadCount: number;
}

function mapMessage(message: MessageRow): ChatMessageDto {
  return {
    id: message.id,
    conversationId: message.conversationId,
    senderId: message.senderId,
    senderType: message.senderType,
    body: message.body,
    attachments: message.attachments,
    readAt: message.readAt?.toISOString() ?? null,
    createdAt: message.createdAt.toISOString(),
  };
}

function guestLabel(id: string): string {
  return `Visiteur ${id.slice(-4).toUpperCase()}`;
}

async function mapConversation(
  conversation: ConversationWithLast,
  unreadCount = 0,
): Promise<ChatConversationDto> {
  return {
    id: conversation.id,
    status: conversation.status,
    guestLabel: guestLabel(conversation.id),
    assignedAdminId: conversation.assignedAdminId,
    createdAt: conversation.createdAt.toISOString(),
    updatedAt: conversation.updatedAt.toISOString(),
    lastMessageAt: conversation.lastMessageAt?.toISOString() ?? null,
    lastMessage: conversation.messages[0] ? mapMessage(conversation.messages[0]) : null,
    unreadCount,
  };
}

async function unreadFor(conversationId: string, senderType: SenderType): Promise<number> {
  return prisma.message.count({
    where: { conversationId, senderType, readAt: null },
  });
}

async function getOwnedConversation(id: string, guestId: string) {
  const conversation = await prisma.conversation.findFirst({
    where: { id, guestToken: guestId },
    include: conversationLastMessage,
  });
  if (!conversation) {
    throw new AppError('Conversation introuvable.', 404, 'CONVERSATION_NOT_FOUND');
  }
  return conversation;
}

async function getConversation(id: string) {
  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: conversationLastMessage,
  });
  if (!conversation) {
    throw new AppError('Conversation introuvable.', 404, 'CONVERSATION_NOT_FOUND');
  }
  return conversation;
}

export async function getOrCreateGuestConversation(guestId: string) {
  const existing = await prisma.conversation.findFirst({
    where: { guestToken: guestId, status: { in: ['OPEN', 'PENDING'] } },
    include: conversationLastMessage,
    orderBy: { updatedAt: 'desc' },
  });

  if (existing) return existing;

  return prisma.conversation.create({
    data: { guestToken: guestId, status: 'OPEN' },
    include: conversationLastMessage,
  });
}

export async function createGuestSession(existingToken?: string) {
  let guestId: string;
  if (existingToken) {
    try {
      guestId = verifyGuestToken(existingToken);
    } catch {
      guestId = createGuestId();
    }
  } else {
    guestId = createGuestId();
  }

  const conversation = await getOrCreateGuestConversation(guestId);
  const messages = await listMessagesForConversation(conversation.id, 50);

  return {
    guestToken: signGuestToken(guestId),
    conversation: await mapConversation(conversation, 0),
    messages,
  };
}

export async function getGuestConversation(id: string, guestId: string) {
  const conversation = await getOwnedConversation(id, guestId);
  return mapConversation(conversation, await unreadFor(id, 'ADMIN'));
}

export async function listMessagesForConversation(id: string, limit = 50) {
  const rows = await prisma.message.findMany({
    where: { conversationId: id },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: messageSelect,
  });
  return rows.reverse().map(mapMessage);
}

export async function getGuestMessages(id: string, guestId: string, limit = 50) {
  await getOwnedConversation(id, guestId);
  return listMessagesForConversation(id, limit);
}

async function persistMessage(
  conversationId: string,
  senderType: SenderType,
  body: string,
  senderId: string | null,
) {
  const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
  if (!conversation) {
    throw new AppError('Conversation introuvable.', 404, 'CONVERSATION_NOT_FOUND');
  }

  const message = await prisma.$transaction(async (tx) => {
    const created = await tx.message.create({
      data: { conversationId, senderType, senderId, body },
      select: messageSelect,
    });
    await tx.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: created.createdAt, status: 'OPEN' },
    });
    return created;
  });

  return mapMessage(message);
}

export async function sendGuestMessage(id: string, guestId: string, body: string) {
  await getOwnedConversation(id, guestId);
  const message = await persistMessage(id, 'CUSTOMER', body, null);
  void notifyAdminNewChat(id, guestLabel(id), body).catch(() => {});
  return message;
}

export async function sendAdminMessage(id: string, adminId: string, body: string) {
  await getConversation(id);
  const message = await persistMessage(id, 'ADMIN', body, adminId);
  void notifyCustomerNewChatReply(id, body).catch(() => {});
  return message;
}

export async function markGuestRead(id: string, guestId: string) {
  await getOwnedConversation(id, guestId);
  await prisma.message.updateMany({
    where: { conversationId: id, senderType: 'ADMIN', readAt: null },
    data: { readAt: new Date() },
  });
  return { read: true };
}

export async function markAdminRead(id: string) {
  await getConversation(id);
  await prisma.message.updateMany({
    where: { conversationId: id, senderType: 'CUSTOMER', readAt: null },
    data: { readAt: new Date() },
  });
  return { read: true };
}

export async function listAdminConversations(query: AdminChatListQuery) {
  const where: Prisma.ConversationWhereInput = {};
  if (query.status) where.status = query.status;
  if (query.search) {
    where.OR = [
      { id: { contains: query.search } },
      { guestToken: { contains: query.search } },
    ];
  }

  const [total, rows] = await prisma.$transaction([
    prisma.conversation.count({ where }),
    prisma.conversation.findMany({
      where,
      include: conversationLastMessage,
      orderBy: [{ lastMessageAt: 'desc' }, { updatedAt: 'desc' }],
      skip: (query.page - 1) * query.perPage,
      take: query.perPage,
    }),
  ]);

  const data = await Promise.all(
    rows.map(async (conversation) =>
      mapConversation(conversation, await unreadFor(conversation.id, 'CUSTOMER')),
    ),
  );

  return {
    data,
    meta: {
      page: query.page,
      perPage: query.perPage,
      total,
      totalPages: Math.ceil(total / query.perPage),
    },
  };
}

export async function getAdminConversation(id: string) {
  const conversation = await getConversation(id);
  await markAdminRead(id);
  return {
    conversation: await mapConversation(conversation, 0),
    messages: await listMessagesForConversation(id, 100),
  };
}

export async function updateAdminConversation(id: string, input: AdminChatUpdateInput) {
  await getConversation(id);
  if (input.assignedAdminId) {
    const admin = await prisma.user.findUnique({ where: { id: input.assignedAdminId } });
    if (!admin) throw new AppError('Administrateur introuvable.', 404, 'ADMIN_NOT_FOUND');
  }

  const conversation = await prisma.conversation.update({
    where: { id },
    data: {
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.assignedAdminId !== undefined
        ? { assignedAdminId: input.assignedAdminId }
        : {}),
    },
    include: conversationLastMessage,
  });

  return mapConversation(conversation, await unreadFor(id, 'CUSTOMER'));
}
