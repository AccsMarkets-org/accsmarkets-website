import { prisma } from "@/lib/db";
import { AdminErasureQueue } from "@/components/admin/AdminErasureQueue";

export const metadata = { title: "Legal" };

export default async function AdminLegalPage() {
  const requests = await prisma.dataErasureRequest.findMany({
    where: { status: { in: ["PENDING", "REVIEWING"] } },
    orderBy: { requestedAt: "asc" },
    include: {
      user: { select: { id: true, email: true, name: true, createdAt: true } },
    },
  });

  const resolved = await prisma.dataErasureRequest.findMany({
    where: { status: { in: ["COMPLETED", "DENIED"] } },
    orderBy: { completedAt: "desc" },
    take: 20,
    include: {
      user: { select: { id: true, email: true, name: true } },
    },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Legal</h1>
        <p className="mt-1 text-sm text-muted">Erasure requests requiring admin review.</p>
      </div>
      <AdminErasureQueue
        pending={requests.map((r) => ({
          id: r.id,
          status: r.status,
          requestedAt: r.requestedAt.toISOString(),
          user: { id: r.user.id, email: r.user.email, name: r.user.name ?? null, createdAt: r.user.createdAt.toISOString() },
        }))}
        resolved={resolved.map((r) => ({
          id: r.id,
          status: r.status,
          completedAt: r.completedAt?.toISOString() ?? null,
          user: { id: r.user.id, email: r.user.email, name: r.user.name ?? null },
        }))}
      />
    </div>
  );
}
