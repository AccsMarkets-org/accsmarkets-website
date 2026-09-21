import { Metadata } from "next";
import { prisma } from "@/lib/db";
import { LegalPageLayout, LegalSection } from "@/components/ui/LegalPageLayout";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "About",
  description: "AccsMarkets is the escrow layer for the creator economy's secondary market — our mission, what we believe, how we make money, and live platform stats.",
  alternates: { canonical: "/about" },
};

const SECTIONS = [
  { id: "mission", title: "Our Mission" },
  { id: "beliefs", title: "What We Believe" },
  { id: "revenue", title: "How We Make Money" },
  { id: "stats", title: "Platform Stats" },
];

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-surface-border bg-background p-5 text-center shadow-card">
      <span className="text-3xl font-black text-brand-600">{value}</span>
      <span className="mt-1 text-xs text-muted">{label}</span>
    </div>
  );
}

export default async function AboutPage() {
  const [sellerRows, completedEscrows, activePlatforms] = await Promise.all([
    prisma.listing.groupBy({ by: ["sellerId"], where: { status: { in: ["ACTIVE", "SOLD"] } } }).catch(() => []),
    prisma.escrow.count({ where: { status: "COMPLETED" } }).catch(() => 0),
    prisma.listing.groupBy({ by: ["platform"], where: { status: "ACTIVE" } }).catch(() => []),
  ]);
  const sellerCount = sellerRows.length;
  const platformCount = activePlatforms.length;

  return (
    <LegalPageLayout
      title="About AccsMarkets"
      subtitle="The escrow layer for the creator economy's secondary market."
      sections={SECTIONS}
    >
      <LegalSection
        id="mission"
        title="Our Mission"
        icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
      >
        <p>
          Every day, thousands of social media accounts change hands — YouTube channels, Instagram
          pages, TikTok profiles, Telegram communities. Most of those deals happen over DMs with zero
          protection: buyers send money and hope, sellers hand over logins and pray.
        </p>
        <p>
          AccsMarkets exists to remove the leap of faith. We hold the buyer&apos;s payment in escrow,
          give the seller a secure channel to hand over the account, and only release funds once the
          buyer confirms everything works. If a deal falls apart before handover, the buyer gets a
          full refund — fee included.
        </p>
      </LegalSection>

      <LegalSection
        id="beliefs"
        title="What We Believe"
        icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>}
      >
        <ul>
          <li><strong>Trust is earned, not claimed.</strong> Seller reputations come from completed escrows, verified badges, and real reviews.</li>
          <li><strong>The platform should carry the risk.</strong> Not the buyer, not the seller.</li>
          <li><strong>Transparency wins.</strong> Flat, published fees. No hidden cuts on the seller side — sellers receive 100% of their listing price.</li>
        </ul>
      </LegalSection>

      <LegalSection
        id="revenue"
        title="How We Make Money"
        icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
      >
        <p>
          Buyers pay a small escrow fee on top of the sale price (2–5% depending on the seller&apos;s
          plan), and sellers can optionally subscribe to plans with more listing slots and lower buyer
          fees. That&apos;s it.
        </p>
        <p>
          We don&apos;t sell data. We don&apos;t run ads. We don&apos;t take a cut from sellers.
          Our incentives are aligned with yours: more completed deals = more revenue for us.
        </p>
      </LegalSection>

      <LegalSection
        id="stats"
        title="Platform Stats"
        icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
      >
        <p>Live numbers, not marketing copy — pulled straight from the platform:</p>
        <div className="!mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat value={sellerCount.toLocaleString()} label="Active sellers" />
          <Stat value={platformCount.toString()} label="Platforms live" />
          <Stat value={completedEscrows.toLocaleString()} label="Completed escrows" />
          <Stat value="100%" label="Escrow-protected" />
        </div>
        <ul className="!mt-5">
          <li><strong>Multi-chain crypto</strong> support (TRC20, BEP20, ERC20, Polygon, Solana)</li>
          <li><strong>24/7 dispute resolution</strong> by our moderation team</li>
        </ul>
      </LegalSection>
    </LegalPageLayout>
  );
}
