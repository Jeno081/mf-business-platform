'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useAdminChat } from '@/components/AdminChatProvider';
import { AdminLoading, PageState, StatusBadge } from '@/components/Ui';
import {
  fetchAdminChatConversation,
  fetchAdminChatConversations,
  formatDate,
  markAdminChatRead,
  sendAdminChatMessage,
  updateAdminChatConversation,
  type AdminChatConversation,
  type AdminChatMessage,
} from '@/lib/api';
import { SendIcon } from '@/components/Icons';

function formatTime(value: string): string {
  return new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(
    new Date(value),
  );
}

function mergeMessage(current: AdminChatMessage[], incoming: AdminChatMessage): AdminChatMessage[] {
  if (current.some((message) => message.id === incoming.id)) return current;
  return [...current, incoming].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

export default function MessagesPage() {
  const { token } = useAuth();
  const { socket, connected, soundEnabled, toggleSound, refreshUnread } = useAdminChat();
  const [conversations, setConversations] = useState<AdminChatConversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [conversation, setConversation] = useState<AdminChatConversation | null>(null);
  const [messages, setMessages] = useState<AdminChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<number | null>(null);

  async function loadConversations() {
    if (!token) return;
    try {
      const result = await fetchAdminChatConversations(token, {
        perPage: 30,
        status: statusFilter || undefined,
      });
      setConversations(result.data);
      setSelectedId((current) => current ?? result.data[0]?.id ?? null);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de charger les messages.');
    } finally {
      setLoading(false);
    }
  }

  async function loadThread(id: string) {
    if (!token) return;
    setLoadingThread(true);
    try {
      const result = await fetchAdminChatConversation(token, id);
      setConversation(result.data.conversation);
      setMessages(result.data.messages);
      await refreshUnread();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de charger la conversation.');
    } finally {
      setLoadingThread(false);
    }
  }

  useEffect(() => {
    if (!token) return;
    void loadConversations();
    const fallback = window.setInterval(() => void loadConversations(), 30000);
    return () => window.clearInterval(fallback);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, statusFilter]);

  useEffect(() => {
    if (!selectedId) {
      setConversation(null);
      setMessages([]);
      return;
    }
    void loadThread(selectedId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, token]);

  useEffect(() => {
    if (!socket || !selectedId) return;
    socket.emit('conversation:join', { conversationId: selectedId });
    return () => {
      socket.emit('conversation:leave', { conversationId: selectedId });
    };
  }, [socket, selectedId]);

  useEffect(() => {
    if (!socket) return;

    const onUpdated = (payload: { conversationId?: string }) => {
      void loadConversations();
      if (payload?.conversationId && payload.conversationId === selectedId) {
        void loadThread(payload.conversationId);
      }
    };

    const onMessage = (incoming: AdminChatMessage) => {
      if (incoming.conversationId !== selectedId) return;
      setMessages((current) => mergeMessage(current, incoming));
      if (incoming.senderType === 'CUSTOMER' && token && selectedId) {
        void markAdminChatRead(token, selectedId).then(() => refreshUnread()).catch(() => {});
      }
    };

    const onRead = (payload: { conversationId?: string; reader?: string }) => {
      if (payload?.conversationId !== selectedId || payload.reader !== 'customer') return;
      setMessages((current) =>
        current.map((item) =>
          item.senderType === 'ADMIN' ? { ...item, readAt: new Date().toISOString() } : item,
        ),
      );
    };

    const onTyping = (payload: {
      conversationId?: string;
      role?: string;
      typing?: boolean;
    }) => {
      if (payload?.conversationId === selectedId && payload.role === 'customer') {
        setTyping(Boolean(payload.typing));
      }
    };

    socket.on('conversation:updated', onUpdated);
    socket.on('message:new', onMessage);
    socket.on('message:read', onRead);
    socket.on('typing', onTyping);

    return () => {
      socket.off('conversation:updated', onUpdated);
      socket.off('message:new', onMessage);
      socket.off('message:read', onRead);
      socket.off('typing', onTyping);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, selectedId, token, refreshUnread]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    return () => {
      if (typingTimer.current) window.clearTimeout(typingTimer.current);
    };
  }, []);

  async function handleSend() {
    const text = draft.trim();
    if (!token || !selectedId || !text || sending) return;
    setSending(true);
    setMessage('');
    setError('');
    if (typingTimer.current) window.clearTimeout(typingTimer.current);
    socket?.emit('typing', { conversationId: selectedId, typing: false });
    try {
      const result = await sendAdminChatMessage(token, selectedId, text);
      setMessages((current) => mergeMessage(current, result.data));
      setDraft('');
      await loadConversations();
      await refreshUnread();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Envoi impossible.');
    } finally {
      setSending(false);
    }
  }

  function onDraftChange(value: string) {
    setDraft(value);
    if (!socket || !selectedId) return;
    socket.emit('typing', { conversationId: selectedId, typing: true });
    if (typingTimer.current) window.clearTimeout(typingTimer.current);
    typingTimer.current = window.setTimeout(() => {
      socket.emit('typing', { conversationId: selectedId, typing: false });
    }, 1400);
  }

  async function changeStatus(status: string) {
    if (!token || !selectedId) return;
    setMessage('');
    setError('');
    try {
      const result = await updateAdminChatConversation(token, selectedId, { status });
      setConversation(result.data);
      setMessage('Statut de la conversation mis à jour.');
      await loadConversations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mise à jour impossible.');
    }
  }

  if (loading) return <AdminLoading rows={4} />;
  if (error && !conversations.length) {
    return <PageState title="Impossible de charger les messages" tone="danger">{error}</PageState>;
  }

  return (
    <div className="admin-page admin-chat-page">
      <section className="admin-page-head admin-page-head--row">
        <div>
          <p className="admin-eyebrow">Relation client</p>
          <h2>
            Les conversations <em>en direct.</em>
          </h2>
          <p className="admin-chat-live">
            <i className={connected ? 'is-online' : undefined} />
            {connected ? 'Temps réel actif' : 'Reconnexion au temps réel…'}
            <span>·</span>
            {conversations.length} conversation{conversations.length > 1 ? 's' : ''}
          </p>
        </div>
        <div className="admin-chat-head-actions">
          <button
            className={`admin-btn admin-btn--sm ${soundEnabled ? 'admin-btn--dark' : 'admin-btn--ghost'}`}
            type="button"
            onClick={toggleSound}
          >
            {soundEnabled ? 'Son activé' : 'Son coupé'}
          </button>
          <select
            className="admin-select"
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value);
              setSelectedId(null);
            }}
            aria-label="Filtrer les conversations"
          >
            <option value="">Toutes</option>
            <option value="OPEN">Ouvertes</option>
            <option value="PENDING">En attente</option>
            <option value="CLOSED">Fermées</option>
          </select>
        </div>
      </section>

      {message && <div className="admin-alert admin-alert--success">{message}</div>}
      {error && <div className="admin-alert admin-alert--danger">{error}</div>}

      <div className="admin-chat-layout">
        <aside className="admin-chat-list">
          <div className="admin-chat-list__head">
            <strong>Conversations</strong>
            <span>{conversations.length}</span>
          </div>
          {conversations.length === 0 ? (
            <div className="admin-empty admin-empty--small">
              <strong>Aucune conversation.</strong>
              <p>Les messages du widget public apparaîtront ici.</p>
            </div>
          ) : (
            <div className="admin-chat-list__items">
              {conversations.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={item.id === selectedId ? 'is-active' : undefined}
                  onClick={() => setSelectedId(item.id)}
                >
                  <span className="admin-chat-list__avatar">MF</span>
                  <span className="admin-chat-list__body">
                    <span className="admin-chat-list__top">
                      <strong>{item.guestLabel}</strong>
                      {item.lastMessageAt && <em>{formatTime(item.lastMessageAt)}</em>}
                    </span>
                    <span className="admin-chat-list__preview">
                      {item.lastMessage?.body ?? 'Nouvelle conversation'}
                    </span>
                  </span>
                  {item.unreadCount > 0 && (
                    <span className="admin-chat-list__unread">{item.unreadCount}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </aside>

        <section className="admin-chat-thread">
          {!conversation ? (
            <div className="admin-empty">
              <strong>Sélectionnez une conversation.</strong>
              <p>Le fil de discussion apparaîtra ici.</p>
            </div>
          ) : (
            <>
              <header className="admin-chat-thread__head">
                <div>
                  <p className="admin-eyebrow">Conversation</p>
                  <h3>{conversation.guestLabel}</h3>
                  <span>{formatDate(conversation.createdAt)}</span>
                </div>
                <div className="admin-chat-thread__actions">
                  <StatusBadge status={conversation.status} />
                  <select
                    className="admin-select"
                    value={conversation.status}
                    onChange={(event) => void changeStatus(event.target.value)}
                    aria-label="Statut de la conversation"
                  >
                    <option value="OPEN">Ouverte</option>
                    <option value="PENDING">En attente</option>
                    <option value="CLOSED">Fermée</option>
                  </select>
                </div>
              </header>

              <div className="admin-chat-messages" ref={scrollRef}>
                {loadingThread && <div className="admin-chat-thread__loading">Synchronisation…</div>}
                {messages.map((item) => {
                  const admin = item.senderType === 'ADMIN';
                  return (
                    <div
                      key={item.id}
                      className={`admin-chat-message ${admin ? 'admin-chat-message--admin' : ''}`}
                    >
                      <span>{admin ? 'Vous' : conversation.guestLabel}</span>
                      <div>{item.body}</div>
                      <em>
                        {formatTime(item.createdAt)}
                        {admin && (
                          <b className={item.readAt ? 'is-read' : undefined} aria-label={item.readAt ? 'Lu' : 'Envoyé'}>
                            {item.readAt ? '✓✓' : '✓'}
                          </b>
                        )}
                      </em>
                    </div>
                  );
                })}
                {messages.length === 0 && (
                  <p className="admin-chat-thread__empty">Aucun message pour le moment.</p>
                )}
                {typing && <p className="admin-chat-thread__typing">Le client écrit…</p>}
              </div>

              <div className="admin-chat-composer">
                <textarea
                  value={draft}
                  onChange={(event) => onDraftChange(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      void handleSend();
                    }
                  }}
                  rows={2}
                  maxLength={2000}
                  placeholder="Répondre au client…"
                  aria-label="Réponse au client"
                />
                <button
                  className="admin-btn admin-btn--primary"
                  type="button"
                  onClick={() => void handleSend()}
                  disabled={sending || !draft.trim()}
                >
                  <SendIcon /> {sending ? 'Envoi…' : 'Envoyer'}
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
