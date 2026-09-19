import { Suspense } from "react";
import dynamic from "next/dynamic";
import { prisma } from "@/lib/db";
import { PartnerProfilePanel } from "@/components/messages/PartnerProfilePanel";

const MessageThread = dynamic(
  () => import("@/components/messages/MessageThread").then((m) => ({ default: m.MessageThread })),
  { ssr: false }
);

export default async function AdminMessageThreadPage({
  params,
}: {
  params: { userId: string };
}) {
  const settings = await prisma.platformSettings.findUnique({
    where: { id: "singleton" },
    select: { officialSupportUserId: true },
  });
  const isOfficialThread = settings?.officialSupportUserId === params.userId;

  return (
    <>
      {/* Center — thread */}
      <div className="flex min-w-0 flex-1 flex-col">
        <Suspense
          fallback={
            <div className="flex flex-1 animate-pulse items-center justify-center bg-surface" />
          }
        >
          <MessageThread partnerId={params.userId} isOfficialThread={isOfficialThread} />
        </Suspense>
      </div>

      {/* Right — profile panel */}
      <div className="hidden w-64 shrink-0 flex-col border-l border-surface-border lg:flex overflow-y-auto">
        <div className="flex h-14 items-center border-b border-surface-border px-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Profile</p>
        </div>
        <PartnerProfilePanel
          partnerId={params.userId}
          isOfficialThread={isOfficialThread}
        />
      </div>
    </>
  );
}
