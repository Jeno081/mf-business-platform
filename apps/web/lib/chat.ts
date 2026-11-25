import { API_URL } from './api';

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string | null;
  senderType: 'CUSTOMER' | 'ADMIN' | 'SYSTEM';
  body: string;
  readAt: string | null;
  createdAt: string;
}

export interface ChatConversation {
  id: string;
  status: string;
  guestLabel: string;
  assignedAdminId: string | null;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string | null;
  lastMessage: ChatMessage | null;
  unreadCount: number;
}

export interface ChatSession {
  guestToken: string;
  conversation: ChatConversation;
  messages: ChatMessage[];
}

async function chatFetch<T>(
  path: string,
  options: RequestInit & { token?: string } = {},
): Promise<T> {
  const { token, headers, ...init } = options;
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

  const payload = (await response.json().catch(() => null)) as
    | (T & { error?: { message?: string } })
    | null;

  if (!response.ok) {
    throw new Error(payload?.error?.message ?? `Chat indisponible (${response.status}).`);
  }

  return (payload ?? ({} as T)) as T;
}

export async function createChatSession(token?: string): Promise<ChatSession> {
  const result = await chatFetch<{ data: ChatSession }>('/api/v1/chat/session', {
    method: 'POST',
    body: JSON.stringify({}),
    token,
  });
  return result.data;
}

export async function fetchChatMessages(
  token: string,
  conversationId: string,
): Promise<ChatMessage[]> {
  const result = await chatFetch<{ data: ChatMessage[] }>(
    `/api/v1/chat/conversations/${conversationId}/messages?limit=50`,
    { token },
  );
  return result.data;
}

export async function sendChatMessage(
  token: string,
  conversationId: string,
  body: string,
): Promise<ChatMessage> {
  const result = await chatFetch<{ data: ChatMessage }>(
    `/api/v1/chat/conversations/${conversationId}/messages`,
    { method: 'POST', body: JSON.stringify({ body }), token },
  );
  return result.data;
}

export async function markChatRead(token: string, conversationId: string): Promise<void> {
  await chatFetch(`/api/v1/chat/conversations/${conversationId}/read`, {
    method: 'POST',
    body: JSON.stringify({}),
    token,
  });
}
