'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { AdminLoading, PageState, StatusBadge } from '@/components/Ui';
import {
  STATUS_LABELS,
  fetchAdminChatConversation,
  fetchAdminChatConversations,
  formatDate,
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

export default function MessagesPage() {
  const { token } = useAuth();
  const [conversations, setConversations] = useState<AdminChatConversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [conversation, setConversation] = useState<AdminChatConversation | null>(null);
  const [messages, setMessages] = useState<AdminChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

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
      await loadConversations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de charger la conversation.');
    } finally {
      setLoadingThread(false);
    }
  }

  useEffect(() => {
    if (!token) return;
    void loadConversations();
    const interval = window.setInterval(() => void loadConversations(), 5000);
    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, statusFilter]);

  useEffect(() => {
    if (!selectedId) {
      setConversation(null);
      setMessages([]);
      return;
    }
    void loadThread(selectedId);
    const interval = window.setInterval(() => void loadThread(selectedId), 5000);
    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, token]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  async function handleSend() {
    const text = draft.trim();
    if (!token || !selectedId || !text || sending) return;
    setSending(true);
    setMessage('');
    setError('');
    try {
      const result = await sendAdminChatMessage(token, selectedId, text);
      setMessages((current) => [...current, result.data]);
      setDraft('');
      await loadConversations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Envoi impossible.');
    } finally {
      setSending(false);
    }
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
          <p>Les nouveaux messages sont actualisés automatiquement toutes les 5 secondes.</p>
        </div>
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
                {loadingThread && <div className="admin-chat-thread__loading">Actualisation…</div>}
                {messages.map((item) => {
                  const admin = item.senderType === 'ADMIN';
                  return (
                    <div
                      key={item.id}
                      className={`admin-chat-message ${admin ? 'admin-chat-message--admin' : ''}`}
                    >
                      <span>{admin ? 'Vous' : conversation.guestLabel}</span>
                      <div>{item.body}</div>
                      <em>{formatTime(item.createdAt)}</em>
                    </div>
                  );
                })}
                {messages.length === 0 && (
                  <p className="admin-chat-thread__empty">Aucun message pour le moment.</p>
                )}
              </div>

              <div className="admin-chat-composer">
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
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
