import { prisma } from "@/lib/db";
import { emitToUser } from "@/lib/socket";
import { sendPushNotification, sendExpoPushNotification } from "@/lib/push";
import type { NotificationType } from "@prisma/client";

interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
}

interface NotifPref {
  type: string;
  email: boolean;
  inApp: boolean;
}

/**
 * Reads the per-type "in-app" preference set on /dashboard/settings/notifications
 * (User.notifPrefs). Missing entry defaults to true, matching that page's own
 * default — most users never touch this page, so absence must mean "on."
 */
async function isInAppEnabled(userId: string, type: NotificationType): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { notifPrefs: true } });
  const prefs = (user?.notifPrefs as unknown as NotifPref[] | null) ?? [];
  const pref = prefs.find((p) => p.type === type);
  return pref?.inApp ?? true;
}

/**
 * Email counterpart of isInAppEnabled — same User.notifPrefs lookup, same
 * "missing entry means on" default. Not enforced centrally (see the note on
 * createNotification below); call sites that send an email for a notification
 * type should gate on this themselves.
 */
export async function wantsEmail(userId: string, type: NotificationType): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { notifPrefs: true } });
  const prefs = (user?.notifPrefs as unknown as NotifPref[] | null) ?? [];
  const pref = prefs.find((p) => p.type === type);
  return pref?.email ?? true;
}

/**
 * DB row is written first so notification history survives an offline recipient;
 * the socket emit is best-effort on top for users currently connected.
 *
 * Respects the user's per-type "in-app" preference (Notifications settings
 * page) — if they've turned a type off, no DB row, socket emit, or push is
 * sent for it. The separate per-type "email" preference on that same page is
 * NOT enforced here: email for these events is sent ad-hoc by each call site
 * (e.g. new-message emails in src/app/api/messages/route.ts), not centrally,
 * so honoring it requires gating each of those call sites individually — a
 * separate, larger change from this in-app fix.
 */
export async function createNotification({ userId, type, title, body, link }: CreateNotificationInput) {
  if (!(await isInAppEnabled(userId, type))) return null;

  const notification = await prisma.notification.create({
    data: { userId, type, title, body, link },
  });

  emitToUser(userId, "notification", {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    body: notification.body,
    link: notification.link,
    createdAt: notification.createdAt,
  });

  sendPushNotification(userId, { title, body, link: link ?? "/" }).catch(() => {});
  sendExpoPushNotification(userId, { title, body, link: link ?? "/" }).catch(() => {});

  return notification;
}
