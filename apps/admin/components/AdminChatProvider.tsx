'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { io, type Socket } from 'socket.io-client';
import { API_URL } from '@/lib/api';
import { fetchAdminChatConversations } from '@/lib/api';
import { useAuth } from './AuthProvider';

interface AdminChatContextValue {
  socket: Socket | null;
  connected: boolean;
  unreadTotal: number;
  soundEnabled: boolean;
  toggleSound: () => void;
  refreshUnread: () => Promise<void>;
}

const AdminChatContext = createContext<AdminChatContextValue | null>(null);

export function AdminChatProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const soundEnabledRef = useRef(true);
  const audioRef = useRef<AudioContext | null>(null);

  const refreshUnread = useCallback(async () => {
    if (!token) return;
    try {
      const result = await fetchAdminChatConversations(token, { perPage: 50 });
      setUnreadTotal(result.data.reduce((total, item) => total + item.unreadCount, 0));
    } catch {
      // La pastille ne bloque pas l’admin.
    }
  }, [token]);

  const playSound = useCallback(() => {
    if (!soundEnabledRef.current) return;
    try {
      const AudioContextClass =
        window.AudioContext ??
        (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
      const context = audioRef.current ?? new AudioContextClass();
      audioRef.current = context;
      if (context.state === 'suspended') void context.resume();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(660, context.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(880, context.currentTime + 0.12);
      gain.gain.setValueAtTime(0.0001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.12, context.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.22);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.24);
    } catch {
      // Certains navigateurs bloquent l’audio sans interaction.
    }
  }, []);

  useEffect(() => {
    const stored = window.localStorage.getItem('mf_admin_chat_sound');
    if (stored === 'off') {
      soundEnabledRef.current = false;
      setSoundEnabled(false);
    }
  }, []);

  const toggleSound = useCallback(() => {
    setSoundEnabled((current) => {
      const next = !current;
      soundEnabledRef.current = next;
      window.localStorage.setItem('mf_admin_chat_sound', next ? 'on' : 'off');
      return next;
    });
  }, []);

  useEffect(() => {
    if (!token) return;

    void refreshUnread();
    const chatSocket = io(API_URL, {
      auth: { role: 'admin', token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 12,
      reconnectionDelayMax: 8000,
    });

    chatSocket.on('connect', () => {
      setConnected(true);
      void refreshUnread();
    });
    chatSocket.on('disconnect', () => setConnected(false));
    chatSocket.on('connect_error', () => setConnected(false));

    chatSocket.on(
      'conversation:updated',
      (payload: { conversationId: string; message?: { senderType: string } }) => {
        void refreshUnread();
        if (payload?.message?.senderType === 'CUSTOMER') {
          playSound();
        }
        window.dispatchEvent(new CustomEvent('mf-admin-chat', { detail: payload }));
      },
    );

    chatSocket.on('message:read', (payload: unknown) => {
      void refreshUnread();
      window.dispatchEvent(new CustomEvent('mf-admin-chat-read', { detail: payload }));
    });

    setSocket(chatSocket);

    return () => {
      chatSocket.disconnect();
      setSocket(null);
      setConnected(false);
    };
  }, [token, refreshUnread, playSound]);

  const value = useMemo<AdminChatContextValue>(
    () => ({ socket, connected, unreadTotal, soundEnabled, toggleSound, refreshUnread }),
    [socket, connected, unreadTotal, soundEnabled, toggleSound, refreshUnread],
  );

  return <AdminChatContext.Provider value={value}>{children}</AdminChatContext.Provider>;
}

export function useAdminChat(): AdminChatContextValue {
  const context = useContext(AdminChatContext);
  if (!context) throw new Error('useAdminChat doit être utilisé dans AdminChatProvider');
  return context;
}
