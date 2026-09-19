import { prisma } from "@/lib/db";
import { Expo } from "expo-server-sdk";

interface PushPayload {
  title: string;
  body: string;
  link?: string;
}

const expo = new Expo();

export async function sendExpoPushNotification(userId: string, payload: PushPayload): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { expoPushToken: true },
    });
    if (!user?.expoPushToken) return;
    if (!Expo.isExpoPushToken(user.expoPushToken)) return;

    await expo.sendPushNotificationsAsync([{
      to: user.expoPushToken,
      title: payload.title,
      body: payload.body,
      data: { link: payload.link ?? "/" },
      sound: "default",
      badge: 1,
    }]);
  } catch {}
}

/**
 * Send a Web Push notification to all push subscriptions for the given userId.
 * Requires VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, and VAPID_SUBJECT env vars.
 * No-ops silently when VAPID keys are not configured.
 */
export async function sendPushNotification(userId: string, payload: PushPayload): Promise<void> {
  const vapidPublic = process.env.VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT ?? "mailto:noreply@accsmarkets.org";

  if (!vapidPublic || !vapidPrivate) return;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let webpush: any = null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    webpush = require("web-push");
    webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);
  } catch {
    return; // web-push not installed — skip silently
  }

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
  });

  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload),
        );
      } catch (err: unknown) {
        // 410 Gone: subscription is expired — remove it
        if ((err as { statusCode?: number })?.statusCode === 410) {
          await prisma.pushSubscription.deleteMany({ where: { endpoint: sub.endpoint } }).catch(() => {});
        }
      }
    }),
  );
}
