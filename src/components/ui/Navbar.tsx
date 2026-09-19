import { getServerSession } from "next-auth";
import { unstable_cache } from "next/cache";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NavbarClient } from "./NavbarClient";

const getUnreadCount = (userId: string) =>
  unstable_cache(
    () => prisma.notification.count({ where: { userId, isRead: false } }),
    [`unread-${userId}`],
    { revalidate: 15, tags: [`unread-${userId}`] },
  )();

export async function Navbar() {
  const session = await getServerSession(authOptions);

  let unreadCount = 0;
  if (session?.user?.id) {
    try {
      unreadCount = await getUnreadCount(session.user.id);
    } catch {}
  }

  return (
    <NavbarClient
      user={
        session?.user
          ? {
              name: session.user.name ?? session.user.email ?? "Account",
              image: session.user.image ?? null,
            }
          : null
      }
      unreadCount={unreadCount}
    />
  );
}
