import { prisma } from '@mf/database';
import { AppError } from '../../middlewares/error-handler';
import { firebaseMessaging, isFirebaseConfigured } from '../../lib/firebase-admin';
import { verifyGuestToken } from '../../lib/chat-tokens';
import type { PushCampaignInput } from './schemas';

interface SendOptions {
  title: string;
  body: string;
  url: string;
  type: 'MARKETING' | 'CHAT' | 'ORDER';
}

async function conversationFromGuestToken(guestToken?: string) {
  if (!guestToken) return null;
  try {
    const guestId = verifyGuestToken(guestToken);
    const conversation = await prisma.conversation.findFirst({
      where: { guestToken: guestId, status: { in: ['OPEN', 'PENDING'] } },
      select: { id: true },
      orderBy: { updatedAt: 'desc' },
    });
    return conversation?.id ?? null;
  } catch {
    return null;
  }
}

export async function subscribeToPush(
  token: string,
  userAgent: string | null,
  guestToken?: string,
) {
  const conversationId = await conversationFromGuestToken(guestToken);
  return prisma.pushSubscription.upsert({
    where: { endpoint: token },
    update: {
      p256dh: 'fcm',
      auth: 'fcm',
      userAgent,
      role: 'CUSTOMER',
      ...(conversationId ? { conversationId } : {}),
      revokedAt: null,
    },
    create: {
      endpoint: token,
      p256dh: 'fcm',
      auth: 'fcm',
      userAgent,
      role: 'CUSTOMER',
      conversationId,
    },
  });
}

export async function subscribeAdminToPush(token: string, userAgent: string | null) {
  return prisma.pushSubscription.upsert({
    where: { endpoint: token },
    update: {
      p256dh: 'fcm',
      auth: 'fcm',
      userAgent,
      role: 'ADMIN',
      conversationId: null,
      revokedAt: null,
    },
    create: {
      endpoint: token,
      p256dh: 'fcm',
      auth: 'fcm',
      userAgent,
      role: 'ADMIN',
    },
  });
}

export async function linkPushConversation(token: string, guestToken: string) {
  const conversationId = await conversationFromGuestToken(guestToken);
  if (!conversationId) {
    throw new AppError('Conversation introuvable.', 404, 'CONVERSATION_NOT_FOUND');
  }
  await prisma.pushSubscription.updateMany({
    where: { endpoint: token, revokedAt: null },
    data: { conversationId, role: 'CUSTOMER' },
  });
  return { linked: true, conversationId };
}

export async function unsubscribeFromPush(token: string) {
  await prisma.pushSubscription.updateMany({
    where: { endpoint: token },
    data: { revokedAt: new Date() },
  });
  return { unsubscribed: true };
}

export async function pushStats() {
  const [active, total, activeCustomers, activeAdmins] = await Promise.all([
    prisma.pushSubscription.count({ where: { revokedAt: null } }),
    prisma.pushSubscription.count(),
    prisma.pushSubscription.count({ where: { revokedAt: null, role: 'CUSTOMER' } }),
    prisma.pushSubscription.count({ where: { revokedAt: null, role: 'ADMIN' } }),
  ]);
  return {
    active,
    total,
    activeCustomers,
    activeAdmins,
    configured: isFirebaseConfigured(),
  };
}

async function sendToSubscriptions(
  where: { role?: string; conversationId?: string; endpoint?: string },
  options: SendOptions,
) {
  if (!isFirebaseConfigured()) return { total: 0, success: 0, failed: 0, invalid: 0 };

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { revokedAt: null, ...where },
    select: { id: true, endpoint: true },
  });

  if (subscriptions.length === 0) {
    return { total: 0, success: 0, failed: 0, invalid: 0 };
  }

  const messaging = firebaseMessaging();
  const chunks: typeof subscriptions[] = [];
  for (let index = 0; index < subscriptions.length; index += 500) {
    chunks.push(subscriptions.slice(index, index + 500));
  }

  let success = 0;
  let failed = 0;
  const invalidIds: string[] = [];

  for (const chunk of chunks) {
    const response = await messaging.sendEachForMulticast({
      tokens: chunk.map((item) => item.endpoint),
      notification: { title: options.title, body: options.body },
      data: { url: options.url, type: options.type },
      webpush: {
        notification: {
          icon: '/icons/icon-192.png',
          badge: '/icons/icon-192.png',
          tag: `mf-${options.type.toLowerCase()}`,
          renotify: options.type !== 'MARKETING',
        },
        fcmOptions: { link: options.url },
      },
    });

    success += response.successCount;
    failed += response.failureCount;
    response.responses.forEach((result, index) => {
      if (!result.success && result.error) {
        const code = result.error.code;
        if (
          code === 'messaging/registration-token-not-registered' ||
          code === 'messaging/invalid-registration-token'
        ) {
          const subscription = chunk[index];
          if (subscription) invalidIds.push(subscription.id);
        }
      }
    });
  }

  if (invalidIds.length > 0) {
    await prisma.pushSubscription.updateMany({
      where: { id: { in: invalidIds } },
      data: { revokedAt: new Date() },
    });
  }

  return {
    total: subscriptions.length,
    success,
    failed,
    invalid: invalidIds.length,
  };
}

export async function sendPushCampaign(input: PushCampaignInput) {
  if (!isFirebaseConfigured()) {
    throw new AppError(
      'Firebase n’est pas configuré sur l’API. Ajoutez le compte de service Firebase sur Render.',
      503,
      'FIREBASE_NOT_CONFIGURED',
    );
  }

  const siteUrl = 'https://mf-business-platform.vercel.app';
  const requested = input.url?.trim();
  const link = requested
    ? requested.startsWith('http')
      ? requested
      : `${siteUrl}${requested.startsWith('/') ? requested : `/${requested}`}`
    : siteUrl;
  const publicUrl = requested || '/';

  const result = await sendToSubscriptions(
    { role: 'CUSTOMER' },
    {
      title: input.title,
      body: input.body,
      url: link,
      type: 'MARKETING',
    },
  );

  const announcement = await prisma.announcement.create({
    data: {
      title: input.title,
      body: input.body,
      url: publicUrl,
      pushSuccess: result.success,
      pushFailed: result.failed,
    },
  });

  await prisma.auditLog.create({
    data: {
      action: 'PUSH_CAMPAIGN_SENT',
      entityType: 'PushCampaign',
      after: {
        title: input.title,
        body: input.body,
        url: link,
        ...result,
      },
    },
  });

  return { ...result, announcementId: announcement.id };
}

function preview(body: string): string {
  return body.length > 120 ? `${body.slice(0, 117)}…` : body;
}

export async function notifyAdminNewChat(
  conversationId: string,
  guestLabel: string,
  body: string,
): Promise<void> {
  await sendToSubscriptions(
    { role: 'ADMIN' },
    {
      title: `Nouveau message de ${guestLabel}`,
      body: preview(body),
      url: `https://admin-mf-business.vercel.app/messages?conversation=${conversationId}`,
      type: 'CHAT',
    },
  );
}

export async function notifyCustomerNewChatReply(
  conversationId: string,
  body: string,
): Promise<void> {
  await sendToSubscriptions(
    { role: 'CUSTOMER', conversationId },
    {
      title: 'Maison Forlife — nouvelle réponse',
      body: preview(body),
      url: 'https://mf-business-platform.vercel.app/?chat=1',
      type: 'CHAT',
    },
  );
}

export async function notifyAdminNewOrder(
  orderNumber: string,
  total: string,
): Promise<void> {
  await sendToSubscriptions(
    { role: 'ADMIN' },
    {
      title: 'Nouvelle commande reçue',
      body: `${orderNumber} · ${total}`,
      url: 'https://admin-mf-business.vercel.app/commandes',
      type: 'ORDER',
    },
  );
}

export async function notifyCustomerOrderStatus(
  pushToken: string | null,
  orderNumber: string,
  statusLabel: string,
  trackingUrl: string,
): Promise<void> {
  if (!pushToken) return;
  await sendToSubscriptions(
    { endpoint: pushToken },
    {
      title: `Commande ${orderNumber}`,
      body: statusLabel,
      url: trackingUrl,
      type: 'ORDER',
    },
  );
}
