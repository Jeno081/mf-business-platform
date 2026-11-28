'use client';

import { useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { API_URL } from '@/lib/api';
import {
  createChatSession,
  fetchChatMessages,
  markChatRead,
  sendChatMessage,
  type ChatConversation,
  type ChatMessage,
} from '@/lib/chat';
import { ChatIcon, CloseIcon, SendIcon } from './Icons';

const TOKEN_KEY = 'mf_chat_guest_token';

function formatTime(value: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function mergeMessage(current: ChatMessage[], incoming: ChatMessage): ChatMessage[] {
  if (current.some((message) => message.id === incoming.id)) return current;
  return [...current, incoming].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(false);
  const [unread, setUnread] = useState(0);
  const [typing, setTyping] = useState(false);
  const [draft, setDraft] = useState('');

  const socketRef = useRef<Socket | null>(null);
  const initialized = useRef(false);
  const openRef = useRef(false);
  const messagesRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimer = useRef<number | null>(null);

  openRef.current = open;

  const scrollToBottom = () => {
    window.requestAnimationFrame(() => {
      const element = messagesRef.current;
      if (element) element.scrollTop = element.scrollHeight;
    });
  };

  const markRead = async (activeToken: string, activeSession: ChatConversation) => {
    try {
      await markChatRead(activeToken, activeSession.id);
      setUnread(0);
    } catch {
      // Le badge ne doit pas bloquer la conversation.
    }
  };

  const connectSocket = (activeToken: string, activeSession: ChatConversation) => {
    if (socketRef.current) return;

    const socket = io(API_URL, {
      auth: { role: 'customer', guestToken: activeToken },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 8,
      reconnectionDelayMax: 5000,
    });

    socket.on('connect', () => {
      setConnected(true);
      void fetchChatMessages(activeToken, activeSession.id)
        .then((history) => setMessages(history))
        .catch(() => {});
    });

    socket.on('disconnect', () => setConnected(false));
    socket.on('connect_error', () => setConnected(false));

    socket.on('message:new', (message: ChatMessage) => {
      if (message.conversationId !== activeSession.id) return;
      setMessages((current) => mergeMessage(current, message));
      if (!openRef.current && message.senderType === 'ADMIN') {
        setUnread((count) => count + 1);
      }
      if (openRef.current && message.senderType === 'ADMIN') {
        void markChatRead(activeToken, activeSession.id);
      }
      scrollToBottom();
    });

    socket.on(
      'message:read',
      (payload: { conversationId?: string; reader?: string }) => {
        if (payload.conversationId !== activeSession.id || payload.reader !== 'admin') return;
        setMessages((current) =>
          current.map((message) =>
            message.senderType === 'CUSTOMER' && !message.readAt
              ? { ...message, readAt: new Date().toISOString() }
              : message,
          ),
        );
      },
    );

    socket.on(
      'typing',
      (payload: { conversationId: string; role: string; typing: boolean }) => {
        if (payload.conversationId === activeSession.id && payload.role === 'admin') {
          setTyping(payload.typing);
        }
      },
    );

    socketRef.current = socket;
  };

  const initialize = async () => {
    if (initialized.current || loading) return;
    initialized.current = true;
    setLoading(true);
    setError('');
    try {
      const stored = window.localStorage.getItem(TOKEN_KEY) ?? undefined;
      const result = await createChatSession(stored);
      window.localStorage.setItem(TOKEN_KEY, result.guestToken);
      setToken(result.guestToken);
      setSession(result.conversation);
      setMessages(result.messages);
      setUnread(result.conversation.unreadCount);
      connectSocket(result.guestToken, result.conversation);
      const pushToken = window.localStorage.getItem('mf_push_token');
      if (pushToken) {
        void fetch(`${API_URL}/api/v1/push/link-conversation`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: pushToken, guestToken: result.guestToken }),
        }).catch(() => {});
      }
      scrollToBottom();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Le chat est momentanément indisponible.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('chat') === '1') {
      setOpen(true);
    }
  }, []);

  useEffect(() => {
    if (!open || session || loading) return;
    void initialize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, session, loading]);

  useEffect(() => {
    document.body.classList.toggle('chat-is-open', open);
    return () => document.body.classList.remove('chat-is-open');
  }, [open]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) return;
    if (session && token) {
      setUnread(0);
      void markRead(token, session);
    }
    window.setTimeout(() => inputRef.current?.focus(), 150);
    scrollToBottom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, session, token]);

  useEffect(() => {
    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
      if (typingTimer.current) window.clearTimeout(typingTimer.current);
    };
  }, []);

  async function handleSend() {
    const text = draft.trim();
    if (!text || !session || !token || sending) return;
    setSending(true);
    setDraft('');
    if (typingTimer.current) window.clearTimeout(typingTimer.current);
    socketRef.current?.emit('typing', { conversationId: session.id, typing: false });
    try {
      const message = await sendChatMessage(token, session.id, text);
      setMessages((current) => mergeMessage(current, message));
      scrollToBottom();
    } catch (err) {
      setDraft(text);
      setError(err instanceof Error ? err.message : 'Le message n’a pas pu être envoyé.');
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  function onDraftChange(value: string) {
    setDraft(value);
    if (!socketRef.current || !session) return;
    socketRef.current.emit('typing', { conversationId: session.id, typing: true });
    if (typingTimer.current) window.clearTimeout(typingTimer.current);
    typingTimer.current = window.setTimeout(() => {
      socketRef.current?.emit('typing', { conversationId: session.id, typing: false });
    }, 1400);
  }

  function handleComposerKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  }

  return (
    <div className="chat-widget">
      {open && (
        <>
          <button
            className="chat-widget__scrim"
            type="button"
            aria-label="Fermer le chat"
            onClick={() => setOpen(false)}
          />
          <section
            className="chat-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Chat avec MF Business"
          >
            <header className="chat-panel__head">
              <span className="chat-panel__avatar">MF</span>
              <div className="chat-panel__identity">
                <strong>Maison Forlife</strong>
                <span>
                  <i className={connected ? 'is-online' : undefined} />
                  {connected ? 'En ligne · réponse rapide' : 'Connexion en cours…'}
                </span>
              </div>
              <button
                className="chat-panel__close"
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fermer le chat"
              >
                <CloseIcon />
              </button>
            </header>

            <div className="chat-panel__messages" ref={messagesRef}>
              <div className="chat-intro">
                <span className="chat-intro__mark">MF</span>
                <strong>Bonjour, bienvenue chez Maison Forlife.</strong>
                <p>
                  Une question sur un produit, une livraison ou une commande ? Écrivez-nous, un
                  conseiller vous répond.
                </p>
              </div>

              {loading && (
                <div className="chat-loading" aria-busy="true">
                  <span />
                  <span />
                  <span />
                </div>
              )}

              {error && (
                <div className="chat-error">
                  <p>{error}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setError('');
                      initialized.current = false;
                      void initialize();
                    }}
                  >
                    Réessayer
                  </button>
                </div>
              )}

              {messages.map((message) => {
                const mine = message.senderType === 'CUSTOMER';
                return (
                  <div
                    className={`chat-message ${mine ? 'chat-message--mine' : 'chat-message--admin'}`}
                    key={message.id}
                  >
                    {!mine && <span className="chat-message__author">Équipe MF Business</span>}
                    <div className="chat-message__bubble">{message.body}</div>
                    <span className="chat-message__time">
                      {formatTime(message.createdAt)}
                      {mine && (
                        <b
                          className={message.readAt ? 'chat-message__ticks is-read' : 'chat-message__ticks'}
                          aria-label={message.readAt ? 'Lu' : 'Envoyé'}
                        >
                          {message.readAt ? '✓✓' : '✓'}
                        </b>
                      )}
                    </span>
                  </div>
                );
              })}

              {typing && (
                <div className="chat-typing" aria-label="L’équipe écrit">
                  <span />
                  <span />
                  <span />
                </div>
              )}
            </div>

            <footer className="chat-panel__composer">
              <textarea
                ref={inputRef}
                rows={1}
                maxLength={2000}
                value={draft}
                onChange={(event) => onDraftChange(event.target.value)}
                onKeyDown={handleComposerKeyDown}
                placeholder="Écrivez votre message…"
                aria-label="Votre message"
              />
              <button
                type="button"
                onClick={() => void handleSend()}
                disabled={!draft.trim() || sending || !session}
                aria-label="Envoyer le message"
              >
                <SendIcon />
              </button>
              <p>Réponse par un conseiller · Paiement jamais demandé dans le chat.</p>
            </footer>
          </section>
        </>
      )}

      {!open && (
        <button
          className="chat-bubble"
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Ouvrir le chat avec MF Business"
        >
          <ChatIcon />
          <span className="chat-bubble__label">Une question ?</span>
          {unread > 0 && <span className="chat-bubble__count">{unread}</span>}
        </button>
      )}
    </div>
  );
}
