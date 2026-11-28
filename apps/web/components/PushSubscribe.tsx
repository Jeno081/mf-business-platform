'use client';

import { useEffect, useRef, useState } from 'react';
import { API_URL } from '@/lib/api';
import {
  firebaseConfig,
  firebaseVapidKey,
  isFirebaseConfigured,
} from '@/lib/firebase-config';

type Status = 'idle' | 'loading' | 'enabled' | 'denied' | 'error' | 'ios-install';

function platformName(): string {
  const ua = navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios';
  if (/android/i.test(ua)) return 'android';
  return 'desktop';
}

async function prepareServiceWorker(): Promise<ServiceWorkerRegistration> {
  // Nettoyer l’ancien worker Firebase root qui entrait en conflit avec le SW PWA.
  const registrations = await navigator.serviceWorker.getRegistrations();
  for (const registration of registrations) {
    const script =
      registration.active?.scriptURL ??
      registration.waiting?.scriptURL ??
      registration.installing?.scriptURL;
    if (script?.endsWith('/firebase-messaging-sw.js')) {
      await registration.unregister();
    }
  }

  const registration = await navigator.serviceWorker.register('/sw.js', {
    scope: '/',
    updateViaCache: 'none',
  });
  await navigator.serviceWorker.ready;
  return registration;
}

export function PushSubscribe() {
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');
  const foregroundBound = useRef(false);

  async function syncSubscription(): Promise<void> {
    const registration = await prepareServiceWorker();
    const { getApps, initializeApp } = await import('firebase/app');
    const { getMessaging, getToken, onMessage } = await import('firebase/messaging');
    const app =
      getApps().find((item) => item.name === 'mf-push') ??
      initializeApp(firebaseConfig, 'mf-push');
    const messaging = getMessaging(app);
    const token = await getToken(messaging, {
      vapidKey: firebaseVapidKey,
      serviceWorkerRegistration: registration,
    });

    if (!token) throw new Error('Firebase n’a pas retourné de token.');

    const response = await fetch(`${API_URL}/api/v1/push/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, platform: platformName() }),
    });
    const payload = (await response.json().catch(() => null)) as
      | { error?: { message?: string } }
      | null;
    if (!response.ok) {
      throw new Error(payload?.error?.message ?? 'Abonnement impossible.');
    }

    const previousToken = window.localStorage.getItem('mf_push_token');
    if (previousToken && previousToken !== token) {
      void fetch(`${API_URL}/api/v1/push/unsubscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: previousToken }),
      }).catch(() => {});
    }
    window.localStorage.setItem('mf_push_token', token);

    if (!foregroundBound.current) {
      onMessage(messaging, (message) => {
        const notification = message.notification;
        if (notification && Notification.permission === 'granted') {
          const data = message.data as { url?: string } | undefined;
          new Notification(notification.title ?? 'MF Business', {
            body: notification.body ?? '',
            icon: '/icons/icon-192.png',
            data: { url: data?.url ?? '/' },
          }).onclick = () => {
            window.open(data?.url ?? '/', '_blank');
          };
        }
      });
      foregroundBound.current = true;
    }

    window.localStorage.setItem('mf_push_enabled', '1');
    setStatus('enabled');
  }

  useEffect(() => {
    if (!isFirebaseConfigured || typeof window === 'undefined' || !('Notification' in window)) {
      return;
    }
    if (Notification.permission === 'denied') {
      setStatus('denied');
      return;
    }
    if (
      Notification.permission === 'granted' &&
      window.localStorage.getItem('mf_push_enabled') === '1'
    ) {
      setStatus('loading');
      void syncSubscription().catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Abonnement à rafraîchir.');
        setStatus('error');
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!isFirebaseConfigured) return null;
  if (typeof window === 'undefined' || !('Notification' in window)) return null;

  async function enable() {
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
    if (ios && !standalone) {
      setStatus('ios-install');
      return;
    }

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

      await syncSubscription();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Notifications indisponibles.');
      setStatus('error');
    }
  }

  return (
    <div className="push-subscribe">
      <button
        className={status === 'enabled' ? 'push-subscribe__btn is-enabled' : 'push-subscribe__btn'}
        type="button"
        onClick={() => void enable()}
        disabled={status === 'loading' || status === 'enabled'}
      >
        <span className="push-subscribe__bell" aria-hidden="true">
          {status === 'enabled' ? '✓' : '♢'}
        </span>
        {status === 'loading'
          ? 'Vérification…'
          : status === 'enabled'
            ? 'Notifications activées'
            : status === 'error'
              ? 'Réactiver les notifications'
              : 'Activer les notifications'}
      </button>
      {status === 'enabled' && (
        <button
          className="push-subscribe__refresh"
          type="button"
          onClick={() => void enable()}
        >
          Rafraîchir l’abonnement
        </button>
      )}
      {status === 'denied' && (
        <p>Notifications bloquées. Autorisez-les dans les réglages du navigateur.</p>
      )}
      {status === 'ios-install' && (
        <p>Sur iPhone : installez d’abord MF Business sur l’écran d’accueil, puis activez les notifications.</p>
      )}
      {error && <p>{error}</p>}
    </div>
  );
}
