import type { Server as HttpServer } from 'node:http';
import { Server, type Socket } from 'socket.io';
import { prisma } from '@mf/database';
import { env } from '../config/env';
import { verifyAccessToken } from '../lib/tokens';
import { verifyGuestToken } from '../lib/chat-tokens';
import { conversationRoom, emitChatMessage, setChatServer } from '../lib/chat-realtime';
import { isAdminRole } from '../types/auth';
import {
  getOrCreateGuestConversation,
  getGuestMessages,
  markAdminRead,
  markGuestRead,
  sendAdminMessage,
  sendGuestMessage,
} from '../modules/chat/service';
import { chatMessageSchema } from '../modules/chat/schemas';

interface ChatSocketData {
  role: 'customer' | 'admin';
  guestId?: string;
  adminId?: string;
  adminEmail?: string;
  conversationId?: string;
  messageTimes: number[];
}

type Ack = (result: { ok: boolean; data?: unknown; error?: string }) => void;

function ack(callback: unknown, result: { ok: boolean; data?: unknown; error?: string }): void {
  if (typeof callback === 'function') (callback as Ack)(result);
}

function socketError(socket: Socket, message: string): void {
  socket.emit('chat:error', { message });
}

function rateLimited(socket: Socket<never, never, never, ChatSocketData>): boolean {
  const now = Date.now();
  socket.data.messageTimes = socket.data.messageTimes.filter((time) => now - time < 10_000);
  if (socket.data.messageTimes.length >= 15) return true;
  socket.data.messageTimes.push(now);
  return false;
}

async function canJoinConversation(
  socket: Socket<never, never, never, ChatSocketData>,
  conversationId: string,
): Promise<boolean> {
  if (socket.data.role === 'admin') return true;
  if (!socket.data.guestId) return false;
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, guestToken: socket.data.guestId },
    select: { id: true },
  });
  return Boolean(conversation);
}

export function initChatRealtime(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: {
      origin: env.CORS_ORIGINS,
      credentials: true,
    },
    path: '/socket.io',
    maxHttpBufferSize: 64 * 1024,
  });

  setChatServer(io);

  io.use(async (socket, next) => {
    try {
      const auth = socket.handshake.auth as {
        role?: string;
        guestToken?: string;
        token?: string;
      };

      if (auth.role === 'admin') {
        if (!auth.token) throw new Error('Token administrateur requis.');
        const payload = verifyAccessToken(auth.token);
        const user = await prisma.user.findUnique({
          where: { id: payload.sub },
          select: { id: true, email: true, role: true, status: true },
        });
        if (!user || user.status !== 'ACTIVE' || !isAdminRole(user.role)) {
          throw new Error('Accès administrateur requis.');
        }
        socket.data.role = 'admin';
        socket.data.adminId = user.id;
        socket.data.adminEmail = user.email;
        next();
        return;
      }

      if (auth.role === 'customer') {
        if (!auth.guestToken) throw new Error('Session de chat requise.');
        const guestId = verifyGuestToken(auth.guestToken);
        const conversation = await getOrCreateGuestConversation(guestId);
        socket.data.role = 'customer';
        socket.data.guestId = guestId;
        socket.data.conversationId = conversation.id;
        next();
        return;
      }

      next(new Error('Rôle de chat inconnu.'));
    } catch (error) {
      next(new Error(error instanceof Error ? error.message : 'Authentification chat impossible.'));
    }
  });

  io.on('connection', (socket) => {
    socket.data.messageTimes = [];

    if (socket.data.role === 'admin') {
      socket.join('admin:inbox');
      socket.emit('admin:ready');
    } else if (socket.data.role === 'customer' && socket.data.conversationId) {
      socket.join(conversationRoom(socket.data.conversationId));
      socket.emit('conversation:ready', { conversationId: socket.data.conversationId });
    }

    socket.on(
      'conversation:join',
      async (payload: { conversationId?: string }, callback?: unknown) => {
        const conversationId = payload?.conversationId;
        if (!conversationId) {
          ack(callback, { ok: false, error: 'Conversation requise.' });
          return;
        }
        if (!(await canJoinConversation(socket, conversationId))) {
          ack(callback, { ok: false, error: 'Conversation inaccessible.' });
          return;
        }
        await socket.join(conversationRoom(conversationId));
        ack(callback, { ok: true, data: { conversationId } });
      },
    );

    socket.on('conversation:leave', async (payload: { conversationId?: string }) => {
      if (payload?.conversationId) await socket.leave(conversationRoom(payload.conversationId));
    });

    socket.on(
      'message:send',
      async (
        payload: { conversationId?: string; body?: string },
        callback?: unknown,
      ) => {
        try {
          if (rateLimited(socket)) {
            ack(callback, { ok: false, error: 'Trop de messages. Patientez un instant.' });
            return;
          }

          const parsed = chatMessageSchema.safeParse({ body: payload?.body ?? '' });
          if (!parsed.success) {
            ack(callback, { ok: false, error: 'Message invalide.' });
            return;
          }

          const conversationId =
            socket.data.role === 'admin'
              ? payload?.conversationId
              : socket.data.conversationId;

          if (!conversationId) {
            ack(callback, { ok: false, error: 'Conversation introuvable.' });
            return;
          }

          if (!(await canJoinConversation(socket, conversationId))) {
            ack(callback, { ok: false, error: 'Conversation inaccessible.' });
            return;
          }

          const message =
            socket.data.role === 'admin' && socket.data.adminId
              ? await sendAdminMessage(conversationId, socket.data.adminId, parsed.data.body)
              : await sendGuestMessage(conversationId, socket.data.guestId!, parsed.data.body);

          emitChatMessage(message);
          ack(callback, { ok: true, data: message });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Envoi impossible.';
          socketError(socket, message);
          ack(callback, { ok: false, error: message });
        }
      },
    );

    socket.on(
      'message:read',
      async (payload: { conversationId?: string }, callback?: unknown) => {
        try {
          const conversationId = payload?.conversationId;
          if (!conversationId || !(await canJoinConversation(socket, conversationId))) {
            ack(callback, { ok: false, error: 'Conversation inaccessible.' });
            return;
          }

          if (socket.data.role === 'admin') {
            await markAdminRead(conversationId);
          } else {
            await markGuestRead(conversationId, socket.data.guestId!);
          }

          socket.to(conversationRoom(conversationId)).emit('message:read', {
            conversationId,
            reader: socket.data.role,
          });
          ack(callback, { ok: true });
        } catch {
          ack(callback, { ok: false, error: 'Lecture impossible.' });
        }
      },
    );

    socket.on(
      'typing',
      (payload: { conversationId?: string; typing?: boolean }) => {
        if (!payload?.conversationId) return;
        socket.to(conversationRoom(payload.conversationId)).emit('typing', {
          conversationId: payload.conversationId,
          role: socket.data.role,
          typing: Boolean(payload.typing),
        });
      },
    );

    socket.on('disconnect', () => {
      // Aucune présence persistante pour le lot 1.
    });
  });

  return io;
}
