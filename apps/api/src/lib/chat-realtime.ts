import type { Server } from 'socket.io';
import type { ChatMessageDto } from '../modules/chat/service';

let chatServer: Server | null = null;

export function setChatServer(server: Server | null): void {
  chatServer = server;
}

export function conversationRoom(conversationId: string): string {
  return `conversation:${conversationId}`;
}

export function emitChatMessage(message: ChatMessageDto): void {
  if (!chatServer) return;
  chatServer.to(conversationRoom(message.conversationId)).emit('message:new', message);
  chatServer.to('admin:inbox').emit('conversation:updated', {
    conversationId: message.conversationId,
    message,
  });
}

export function emitConversationUpdated(
  conversationId: string,
  payload: Record<string, unknown> = {},
): void {
  if (!chatServer) return;
  chatServer.to('admin:inbox').emit('conversation:updated', {
    conversationId,
    ...payload,
  });
}
