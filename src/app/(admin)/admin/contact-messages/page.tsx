import { prisma } from "@/lib/db";
import { ContactMessagesClient } from "./ContactMessagesClient";

export const dynamic = "force-dynamic";

export default async function ContactMessagesPage() {
  const raw = await prisma.contactMessage.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const messages = raw.map((m) => ({
    ...m,
    createdAt: m.createdAt.toISOString(),
    readAt: m.readAt?.toISOString() ?? null,
  }));

  return <ContactMessagesClient messages={messages} />;
}
