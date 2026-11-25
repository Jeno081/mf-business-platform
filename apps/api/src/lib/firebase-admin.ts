import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { env } from '../config/env';

interface ServiceAccountLike {
  project_id?: string;
  client_email?: string;
  private_key?: string;
  [key: string]: unknown;
}

let app: App | null = null;
let attempted = false;

function parseServiceAccount(): ServiceAccountLike | null {
  let raw = env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw && env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    try {
      raw = Buffer.from(env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8');
    } catch {
      return null;
    }
  }
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ServiceAccountLike;
    if (!parsed.project_id || !parsed.client_email || !parsed.private_key) return null;
    return {
      ...parsed,
      private_key: parsed.private_key.replace(/\\n/g, '\n'),
    };
  } catch {
    return null;
  }
}

export function isFirebaseConfigured(): boolean {
  return Boolean(parseServiceAccount());
}

export function getFirebaseApp(): App {
  if (app) return app;
  if (attempted) throw new Error('Firebase Admin n’est pas configuré.');
  attempted = true;
  const account = parseServiceAccount();
  if (!account) {
    throw new Error('Firebase Admin n’est pas configuré.');
  }

  const existing = getApps()[0];
  app =
    existing ??
    initializeApp({
      credential: cert({
        projectId: account.project_id,
        clientEmail: account.client_email,
        privateKey: account.private_key,
      }),
    });
  return app;
}

export function firebaseMessaging() {
  return getMessaging(getFirebaseApp());
}
