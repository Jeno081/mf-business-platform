'use client';

import { useEffect, useRef, useState } from 'react';
import { API_URL } from '@/lib/api';
import { useAuth } from './AuthProvider';
import {
  adminFirebaseConfig,
  adminFirebaseVapidKey,
  adminFirebaseConfigured,
} from '@/lib/firebase-config';

type Status = 'idle' | 'loading' | 'enabled' | 'denied' | 'error';

export function AdminPushSubscribe() {
  const { token } = useAuth();
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');
  const bound = useRef(false);

  async function subscribe(): Promise<void> {
    if (!token) return;
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
      scope: '/',
      updateViaCache: 'none',
    });
    await navigator.serviceWorker.ready;
    const { getApps, initializeApp } = await import('firebase/app');
    const { getMessaging, getToken, onMessage } = await import('firebase/messaging');
    const app =
      getApps().find((item) => item.name === 'mf-admin-push') ??
      initializeApp(adminFirebaseConfig, 'mf-admin-push');
    const messaging = getMessaging(app);
    const fcmToken = await getToken(messaging, {
      vapidKey: adminFirebaseVapidKey,
      serviceWorkerRegistration: registration,
    });
    if (!fcmToken) throw new Error('Firebase n’a pas retourné de token.');

    const response = await fetch(`${API_URL}/api/v1/admin/push/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ token: fcmToken, platform: 'admin' }),
    });
    if (!response.ok) throw new Error('Impossible d’enregistrer ce téléphone.');

    if (!bound.current) {
      onMessage(messaging, (message) => {
        if (message.notification && Notification.permission === 'granted') {
          const data = (message.data ?? {}) as { url?: string };
          new Notification(message.notification.title ?? 'MF Business Admin', {
            body: message.notification.body ?? '',
            icon: '/favicon.png',
            data: { url: data.url ?? '/' },
          }).onclick = () => window.open(data.url ?? '/', '_blank');
        }
      });
      bound.current = true;
    }

    window.localStorage.setItem('mf_admin_push_enabled', '1');
    setStatus('enabled');
  }

  useEffect(() => {
    if (!adminFirebaseConfigured || typeof window === 'undefined' || !('Notification' in window)) {
      return;
    }
    if (Notification.permission === 'denied') {
      setStatus('denied');
      return;
    }
    if (
      Notification.permission === 'granted' &&
      window.localStorage.getItem('mf_admin_push_enabled') === '1'
    ) {
      setStatus('loading');
      void subscribe().catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Alertes à réactiver.');
        setStatus('error');
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!adminFirebaseConfigured) {
    return (
      <p className="admin-muted">
        Ajoutez les variables Firebase publiques au projet admin Vercel pour recevoir les alertes sur ce téléphone.
      </p>
    );
  }

  async function enable(): Promise<void> {
    setStatus('loading');
    setError('');
    try {
      const permission =
        Notification.permission === 'granted'
          ? 'granted'
          : await Notification.requestPermission();
      if (permission !== 'granted') {
        setStatus('denied');
        return;
      }
      await subscribe();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Activation impossible.');
      setStatus('error');
    }
  }

  return (
    <div className="admin-push-alerts">
      <div>
        <strong>Alertes sur ce téléphone</strong>
        <p className="admin-muted">
          Nouveaux messages du chat et nouvelles commandes, même admin fermé.
        </p>
      </div>
      <button
        className={`admin-btn ${status === 'enabled' ? 'admin-btn--ghost' : 'admin-btn--dark'}`}
        type="button"
        onClick={() => void enable()}
        disabled={status === 'loading' || status === 'enabled'}
      >
        {status === 'loading'
          ? 'Vérification…'
          : status === 'enabled'
            ? 'Alertes activées'
            : status === 'error'
              ? 'Réactiver'
              : 'Activer les alertes'}
      </button>
      {status === 'enabled' && (
        <button className="admin-link-button" type="button" onClick={() => void enable()}>
          Rafraîchir l’abonnement
        </button>
      )}
      {status === 'denied' && <p className="admin-alert admin-alert--danger">Notifications bloquées dans le navigateur.</p>}
      {error && <p className="admin-alert admin-alert--danger">{error}</p>}
    </div>
  );
}
