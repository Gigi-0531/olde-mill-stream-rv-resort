import webpush from 'web-push';
import { storage } from './storage';

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(
    'mailto:admin@oldemillstream.com',
    vapidPublicKey,
    vapidPrivateKey
  );
}

interface PushPayload {
  title: string;
  body: string;
  tag?: string;
  url?: string;
  type?: 'weather' | 'alert' | 'general';
}

export async function sendPushToUser(userId: number, payload: PushPayload): Promise<boolean> {
  try {
    const subscription = await storage.getPushSubscription(userId);
    if (!subscription) return false;

    const pushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh,
        auth: subscription.auth,
      },
    };

    await webpush.sendNotification(pushSubscription, JSON.stringify(payload));
    return true;
  } catch (error: any) {
    if (error.statusCode === 410 || error.statusCode === 404) {
      await storage.deletePushSubscription(userId);
    }
    console.error('Push notification failed:', error);
    return false;
  }
}

export async function sendWeatherAlert(title: string, body: string): Promise<number> {
  const subscriptions = await storage.getAllPushSubscriptions('weather');
  let successCount = 0;

  for (const sub of subscriptions) {
    const pushSubscription = {
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.p256dh,
        auth: sub.auth,
      },
    };

    try {
      await webpush.sendNotification(pushSubscription, JSON.stringify({
        title,
        body,
        tag: 'weather',
        url: '/',
        type: 'weather',
      }));
      successCount++;
    } catch (error: any) {
      if (error.statusCode === 410 || error.statusCode === 404) {
        await storage.deletePushSubscription(sub.userId);
      }
    }
  }

  return successCount;
}

export async function sendResortAlert(title: string, body: string): Promise<number> {
  const subscriptions = await storage.getAllPushSubscriptions('alerts');
  let successCount = 0;

  for (const sub of subscriptions) {
    const pushSubscription = {
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.p256dh,
        auth: sub.auth,
      },
    };

    try {
      await webpush.sendNotification(pushSubscription, JSON.stringify({
        title,
        body,
        tag: 'resort-alert',
        url: '/',
        type: 'alert',
      }));
      successCount++;
    } catch (error: any) {
      if (error.statusCode === 410 || error.statusCode === 404) {
        await storage.deletePushSubscription(sub.userId);
      }
    }
  }

  return successCount;
}

export function getVapidPublicKey(): string {
  return vapidPublicKey || '';
}
