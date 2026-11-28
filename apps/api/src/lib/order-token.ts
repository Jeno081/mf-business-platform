import jwt from 'jsonwebtoken';
import { env } from '../config/env';

const ISSUER = 'mf-business';
const AUDIENCE = 'mf-order-tracking';
const TTL = '365d';

interface OrderTrackingPayload {
  purpose: 'order_tracking';
  sub: string;
}

export function signOrderToken(orderId: string): string {
  return jwt.sign(
    { purpose: 'order_tracking' },
    env.JWT_ACCESS_SECRET,
    {
      subject: orderId,
      expiresIn: TTL,
      issuer: ISSUER,
      audience: AUDIENCE,
    },
  );
}

export function verifyOrderToken(token: string): string {
  const payload = jwt.verify(token, env.JWT_ACCESS_SECRET, {
    issuer: ISSUER,
    audience: AUDIENCE,
  }) as OrderTrackingPayload;
  if (payload.purpose !== 'order_tracking' || !payload.sub) {
    throw new Error('Jeton de commande invalide.');
  }
  return payload.sub;
}

export function trackingUrl(token: string): string {
  return `https://mf-business-platform.vercel.app/suivi/${token}`;
}
