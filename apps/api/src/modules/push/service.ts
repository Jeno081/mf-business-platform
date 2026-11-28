import { prisma } from '@mf/database';
import { AppError } from '../../middlewares/error-handler';
import { firebaseMessaging, isFirebaseConfigured } from '../../lib/firebase-admin';
import type { PushCampaignInput } from './schemas';

export async function subscribeToPush(
  token: string,
  userAgent: string | null,
) {
  return prisma.pushSubscription.upsert({
    where: { endpoint: token },
    update: {
      p256dh: 'fcm',
      auth: 'fcm',
      userAgent,
      revokedAt: null,
    },
    create: {
      endpoint: token,
      p256dh: 'fcm',
      auth: 'fcm',
      userAgent,
    },
  });
}

export async function unsubscribeFromPush(token: string) {
  await prisma.pushSubscription.updateMany({
    where: { endpoint: token },
    data: { revokedAt: new Date() },
  });
  return { unsubscribed: true };
}

export async function pushStats() {
  const [active, total] = await Promise.all([
    prisma.pushSubscription.count({ where: { revokedAt: null } }),
    prisma.pushSubscription.count(),
  ]);
  return {
    active,
    total,
    configured: isFirebaseConfigured(),
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

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { revokedAt: null },
    select: { id: true, endpoint: true },
  });

  const messaging = subscriptions.length > 0 ? firebaseMessaging() : null;
  const siteUrl = 'https://mf-business-platform.vercel.app';
  const requested = input.url?.trim();
  const link = requested
    ? requested.startsWith('http')
      ? requested
      : `${siteUrl}${requested.startsWith('/') ? requested : `/${requested}`}`
    : siteUrl;
  const publicUrl = requested || '/';
  const chunks: typeof subscriptions[] = [];
  for (let index = 0; index < subscriptions.length; index += 500) {
    chunks.push(subscriptions.slice(index, index + 500));
  }

  let success = 0;
  let failed = 0;
  const invalidIds: string[] = [];

  for (const chunk of chunks) {
    if (!messaging) break;
    const response = await messaging.sendEachForMulticast({
      tokens: chunk.map((item) => item.endpoint),
      notification: {
        title: input.title,
        body: input.body,
      },
      data: {
        url: link,
      },
      webpush: {
        notification: {
          icon: '/icons/icon-192.png',
          badge: '/icons/icon-192.png',
          tag: 'mf-business-promo',
          renotify: false,
        },
        fcmOptions: { link },
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

  await prisma.auditLog.create({
    data: {
      action: 'PUSH_CAMPAIGN_SENT',
      entityType: 'PushCampaign',
      after: {
        title: input.title,
        body: input.body,
        url: link,
        total: subscriptions.length,
        success,
        failed,
      },
    },
  });

  const announcement = await prisma.announcement.create({
    data: {
      title: input.title,
      body: input.body,
      url: publicUrl,
      pushSuccess: success,
      pushFailed: failed,
    },
  });

  return {
    total: subscriptions.length,
    success,
    failed,
    invalid: invalidIds.length,
    announcementId: announcement.id,
  };
}
