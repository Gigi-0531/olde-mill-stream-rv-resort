import webpush from 'web-push';
import apn from 'apn';
import { storage } from './storage';

// ── WebPush / VAPID ──────────────────────────────────────────────────────────

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(
    'mailto:admin@oldemillstream.com',
    vapidPublicKey,
    vapidPrivateKey
  );
}

// ── APNs ─────────────────────────────────────────────────────────────────────

const apnsKeyId = process.env.APNS_KEY_ID;
const apnsTeamId = process.env.APNS_TEAM_ID;
const apnsBundleId = process.env.APNS_BUNDLE_ID;
const apnsKeyP8 = process.env.APNS_KEY_P8;

let apnsProvider: apn.Provider | null = null;

if (apnsKeyId && apnsTeamId && apnsKeyP8) {
  try {
    apnsProvider = new apn.Provider({
      token: {
        key: Buffer.from(apnsKeyP8.replace(/\\n/g, '\n')),
        keyId: apnsKeyId,
        teamId: apnsTeamId,
      },
      production: process.env.NODE_ENV === 'production',
    });
    console.log('APNs provider initialized');
  } catch (err) {
    console.error('APNs provider failed to initialize:', err);
  }
}

export async function sendApnsAlert(title: string, body: string): Promise<number> {
  if (!apnsProvider || !apnsBundleId) return 0;

  const tokens = await storage.getAllApnsTokens();
  if (!tokens.length) return 0;

  const note = new apn.Notification();
  note.expiry = Math.floor(Date.now() / 1000) + 3600;
  note.badge = 1;
  note.sound = 'default';
  note.alert = { title, body };
  note.topic = apnsBundleId;

  const deviceTokens = tokens.map(t => t.token);
  const result = await apnsProvider.send(note, deviceTokens);

  for (const failed of result.failed) {
    const reason = (failed as any).response?.reason;
    if (reason === 'BadDeviceToken' || reason === 'Unregistered') {
      await storage.deleteApnsToken(failed.device);
    }
  }

  return result.sent.length;
}

// ── Shared payload type ───────────────────────────────────────────────────────

interface PushPayload {
  title: string;
  body: string;
  tag?: string;
  url?: string;
  type?: 'weather' | 'alert' | 'general';
}

// ── Per-user WebPush ──────────────────────────────────────────────────────────

export async function sendPushToUser(userId: number, payload: PushPayload): Promise<boolean> {
  try {
    const subscription = await storage.getPushSubscription(userId);
    if (!subscription) return false;

    const pushSubscription = {
      endpoint: subscription.endpoint,
      keys: { p256dh: subscription.p256dh, auth: subscription.auth },
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

// ── Broadcast WebPush to weather subscribers ──────────────────────────────────

export async function sendWeatherAlert(title: string, body: string): Promise<number> {
  const subscriptions = await storage.getAllPushSubscriptions('weather');
  let successCount = 0;

  for (const sub of subscriptions) {
    const pushSubscription = {
      endpoint: sub.endpoint,
      keys: { p256dh: sub.p256dh, auth: sub.auth },
    };
    try {
      await webpush.sendNotification(pushSubscription, JSON.stringify({
        title, body, tag: 'weather', url: '/', type: 'weather',
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

// ── OneSignal REST API ────────────────────────────────────────────────────────

const oneSignalAppId = process.env.ONESIGNAL_APP_ID;
const oneSignalRestKey = process.env.ONESIGNAL_REST_API_KEY;

async function sendOneSignalAlert(title: string, body: string): Promise<number> {
  if (!oneSignalAppId || !oneSignalRestKey) return 0;
  try {
    const res = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${oneSignalRestKey}`,
      },
      body: JSON.stringify({
        app_id: oneSignalAppId,
        included_segments: ['All'],
        headings: { en: title },
        contents: { en: body },
        url: '/',
      }),
    });
    const data = await res.json() as { recipients?: number; errors?: any };
    if (data.errors) console.error('OneSignal error:', data.errors);
    return data.recipients ?? 0;
  } catch (err) {
    console.error('OneSignal send failed:', err);
    return 0;
  }
}

// ── OneSignal: notify a single user by external ID ───────────────────────────

export async function sendOneSignalToUser(externalUserId: string, title: string, body: string): Promise<boolean> {
  if (!oneSignalAppId || !oneSignalRestKey) return false;
  try {
    const res = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${oneSignalRestKey}`,
      },
      body: JSON.stringify({
        app_id: oneSignalAppId,
        include_external_user_ids: [externalUserId],
        headings: { en: title },
        contents: { en: body },
        url: '/admin',
      }),
    });
    const data = await res.json() as { recipients?: number; errors?: any };
    if (data.errors) console.error('OneSignal user push error:', data.errors);
    return (data.recipients ?? 0) > 0;
  } catch (err) {
    console.error('OneSignal user push failed:', err);
    return false;
  }
}

// ── Broadcast resort alert to WebPush + OneSignal ────────────────────────────

export async function sendResortAlert(title: string, body: string): Promise<number> {
  const subscriptions = await storage.getAllPushSubscriptions('alerts');
  let successCount = 0;

  // WebPush (browser subscribers)
  for (const sub of subscriptions) {
    const pushSubscription = {
      endpoint: sub.endpoint,
      keys: { p256dh: sub.p256dh, auth: sub.auth },
    };
    try {
      await webpush.sendNotification(pushSubscription, JSON.stringify({
        title, body, tag: 'resort-alert', url: '/', type: 'alert',
      }));
      successCount++;
    } catch (error: any) {
      if (error.statusCode === 410 || error.statusCode === 404) {
        await storage.deletePushSubscription(sub.userId);
      }
    }
  }

  // OneSignal — delivers to all iOS + Android subscribers via Median native SDK
  const oneSignalSent = await sendOneSignalAlert(title, body);
  successCount += oneSignalSent;

  return successCount;
}

export function getVapidPublicKey(): string {
  return vapidPublicKey || '';
}

// ── Scheduled notifications (daily weather) ───────────────────────────────────

// Severe weather condition IDs from OpenWeather API
// https://openweathermap.org/weather-conditions
const SEVERE_WEATHER_IDS = new Set([
  // Thunderstorm
  200, 201, 202, 210, 211, 212, 221, 230, 231, 232,
  // Heavy rain / extreme rain
  502, 503, 504, 511,
  // Heavy snow / sleet
  602, 611, 612, 613, 622,
  // Atmosphere extremes (tornado, squall)
  781, 771,
]);

interface WeatherData {
  temp: number;
  tempMax: number;
  tempMin: number;
  condition: string;
  conditionId: number;
  description: string;
  windSpeed: number;
}

async function fetchCurrentWeather(): Promise<WeatherData | null> {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=Umatilla,FL,US&units=imperial&appid=${apiKey}`
    );
    const data = await res.json() as any;
    return {
      temp: Math.round(data.main.temp),
      tempMax: Math.round(data.main.temp_max),
      tempMin: Math.round(data.main.temp_min),
      condition: data.weather[0].main,
      conditionId: data.weather[0].id,
      description: data.weather[0].description,
      windSpeed: Math.round(data.wind?.speed ?? 0),
    };
  } catch {
    return null;
  }
}

async function checkAndSendSevereWeatherAlert(weather: WeatherData) {
  if (!SEVERE_WEATHER_IDS.has(weather.conditionId)) return;

  const desc = weather.description.charAt(0).toUpperCase() + weather.description.slice(1);
  const body = `⚠️ ${desc} expected in Umatilla — winds up to ${weather.windSpeed} mph. Please take precautions and stay safe.`;
  await sendResortAlert('🚨 Severe Weather Warning', body);
  console.log(`[Scheduler] Severe weather alert sent (condition ID ${weather.conditionId})`);
}

export function startScheduledNotifications() {
  import('node-cron').then(({ default: cron }) => {
    const tz = { timezone: 'America/New_York' };

    // Every 30 minutes — severe weather watch (silent unless conditions are severe)
    cron.schedule('*/30 * * * *', async () => {
      try {
        const w = await fetchCurrentWeather();
        if (w) await checkAndSendSevereWeatherAlert(w);
      } catch {}
    }, tz);

    console.log('[Scheduler] Severe weather watch active (checks every 30 min)');
  }).catch(() => {
    console.warn('[Scheduler] node-cron not available — severe weather watch disabled');
  });
}
