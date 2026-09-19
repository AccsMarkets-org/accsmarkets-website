import { prisma } from "@/lib/db";
import type { Metadata } from "next";

export const revalidate = 3600;
export const metadata: Metadata = { title: "Trust & Safety — AccsMarkets" };

async function getTrustReport() {
  const [
    totalUsers,
    verifiedUsers,
    totalEscrows,
    completedEscrows,
    disputedEscrows,
    activeListings,
    avgTrustScore,
  ] = await Promise.all([
    prisma.user.count({ where: { isBanned: false } }),
    prisma.user.count({ where: { kycLevel: { in: ["PHONE", "ID_VERIFIED"] } } }),
    prisma.escrow.count(),
    prisma.escrow.count({ where: { status: "COMPLETED" } }),
    prisma.escrow.count({ where: { status: "DISPUTED" } }),
    prisma.listing.count({ where: { status: "ACTIVE" } }),
    prisma.user.aggregate({ _avg: { trustScore: true } }).then((r) => Math.round(r._avg.trustScore ?? 0)),
  ]);

  return {
    totalUsers,
    verifiedUsersPct: totalUsers > 0 ? Math.round((verifiedUsers / totalUsers) * 100) : 0,
    totalEscrows,
    completedEscrows,
    escrowSuccessRate:
      completedEscrows + disputedEscrows > 0
        ? Math.round((completedEscrows / (completedEscrows + disputedEscrows)) * 100)
        : 100,
    activeListings,
    avgTrustScore,
  };
}

function Stat({ value, label, suffix = "" }: { value: number | string; label: string; suffix?: string }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-surface-border bg-surface p-6 text-center shadow-card">
      <span className="text-4xl font-black text-brand-600">
        {value}{suffix}
      </span>
      <span className="mt-1 text-sm text-muted">{label}</span>
    </div>
  );
}

export default async function TrustPage() {
  const report = await getTrustReport().catch(() => null);

  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-black">Trust & Safety</h1>
        <p className="mt-3 text-lg text-muted max-w-xl mx-auto">
          We publish live platform metrics so buyers and sellers can make informed decisions.
        </p>
      </div>

      {report ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Stat value={report.totalUsers.toLocaleString()} label="Registered users" />
          <Stat value={report.verifiedUsersPct} label="Verified users" suffix="%" />
          <Stat value={report.totalEscrows.toLocaleString()} label="Total escrows" />
          <Stat value={report.completedEscrows.toLocaleString()} label="Completed transactions" />
          <Stat value={report.escrowSuccessRate} label="Escrow success rate" suffix="%" />
          <Stat value={report.activeListings.toLocaleString()} label="Active listings" />
          <Stat value={report.avgTrustScore} label="Avg. seller trust score" suffix="/100" />
        </div>
      ) : (
        <p className="text-center text-muted">Stats temporarily unavailable.</p>
      )}

      <div className="mt-16 grid gap-6 sm:grid-cols-2">
        {[
          {
            icon: "🔒",
            title: "Escrow protection",
            body: "Funds are held in escrow until the buyer confirms access. Neither party can release funds unilaterally.",
          },
          {
            icon: "🪪",
            title: "KYC verification",
            body: "Sellers can verify their identity to build buyer confidence. Verified badges are shown on listings and profiles.",
          },
          {
            icon: "⚖️",
            title: "Dispute resolution",
            body: "Our team mediates disputes with full evidence review. Most disputes are resolved within 3 business days.",
          },
          {
            icon: "🤖",
            title: "AI content moderation",
            body: "Every listing is automatically scanned for prohibited content before going live.",
          },
          {
            icon: "🏆",
            title: "Trust scores",
            body: "Sellers earn trust points from completed escrows, verified identity, and positive reviews.",
          },
          {
            icon: "📋",
            title: "Compliance",
            body: "We operate under GDPR, offer data export and right to erasure, and are committed to transparent data practices.",
          },
        ].map(({ icon, title, body }) => (
          <div key={title} className="rounded-2xl border border-surface-border bg-surface p-6 shadow-card">
            <p className="mb-2 text-2xl">{icon}</p>
            <h3 className="font-semibold">{title}</h3>
            <p className="mt-1 text-sm text-muted">{body}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
