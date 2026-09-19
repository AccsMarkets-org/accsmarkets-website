import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { SessionRevokeButton } from "@/components/settings/SessionRevokeButton";
import { formatDate } from "@/lib/utils";

function parseUserAgent(ua: string | null): string {
  if (!ua) return "Unknown device";
  if (/iPhone|iPad|iOS/i.test(ua)) return "iOS device";
  if (/Android/i.test(ua)) return "Android device";
  if (/Firefox/i.test(ua)) return "Firefox";
  if (/Edg/i.test(ua)) return "Edge";
  if (/Chrome/i.test(ua)) return "Chrome";
  if (/Safari/i.test(ua)) return "Safari";
  return "Browser";
}

function maskIp(ip: string | null): string {
  if (!ip) return "Unknown IP";
  const parts = ip.split(".");
  if (parts.length === 4) return `${parts[0]}.${parts[1]}.${parts[2]}.•••`;
  return ip.split(":").slice(0, 3).join(":") + ":…";
}

export default async function SessionsPage() {
  const session = await getServerSession(authOptions);
  const sessions = await prisma.activeSession.findMany({
    where: { userId: session!.user.id },
    orderBy: { lastSeenAt: "desc" },
    take: 20,
  });

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Active sessions</h1>
        {sessions.length > 1 && <SessionRevokeButton revokeAll />}
      </div>

      {sessions.length === 0 && (
        <p className="text-sm text-muted">No sessions recorded.</p>
      )}

      <div className="flex flex-col gap-3">
        {sessions.map((s, i) => (
          <Card key={s.id} className="flex items-center justify-between gap-4">
            <div>
              <p className="font-medium text-sm">{parseUserAgent(s.userAgent ?? null)}</p>
              <p className="text-xs text-muted">{maskIp(s.ip ?? null)} · Last seen {formatDate(s.lastSeenAt)}</p>
            </div>
            {i === 0 ? (
              <span className="rounded-full bg-brand-100 dark:bg-brand-900/50 px-2 py-0.5 text-xs font-medium text-brand-700">This device</span>
            ) : (
              <SessionRevokeButton sessionId={s.id} />
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
