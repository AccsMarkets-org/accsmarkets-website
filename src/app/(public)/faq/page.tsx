import { ProsePage } from "@/components/ui/ProsePage";

export const metadata = { title: "FAQ — AccsMarkets" };

const FAQS: { q: string; a: string }[] = [
  { q: "Is my money safe while an escrow is open?", a: "Yes. Funds are debited from your wallet into the platform's escrow ledger and can only move two ways: to the seller when you confirm completion, or back to you on cancellation/refund." },
  { q: "Can I pay without depositing first?", a: "Escrows are funded from your wallet balance, so you deposit first (crypto via NOWPayments or manual USDT). This is what makes refunds instant." },
  { q: "How long do offers last?", a: "Offers expire automatically after 72 hours if the seller doesn't respond." },
  { q: "What does the verified badge mean?", a: "Blue, gold, and grey checkmarks are assigned by the platform team to notable, business, and official accounts respectively — similar to Twitter's system." },
  { q: "What's a trust score?", a: "A 0–100 reputation score. Both buyer and seller earn +5 for every completed escrow. Higher tiers (Rising, Trusted, Elite, Legend) are shown on profiles and listings." },
  { q: "Can I sell more than a few accounts?", a: "The free plan has a limited number of active listings. Paid plans raise that limit and lower the buyer's escrow fee on your listings — see current plans and pricing on the Pricing page." },
  { q: "What if the seller stops responding after I pay?", a: "If the seller never submits credentials, cancel the escrow for a full refund. If they submitted but the handover stalls, open a dispute and our team steps in." },
  { q: "Do you support PayPal or cards?", a: "Not currently. Crypto rails (TRON, BNB Chain, Ethereum, Polygon, Solana) keep funding fast, global, and chargeback-free — which is what makes instant refunds possible." },
];

export default function FaqPage() {
  return (
    <ProsePage title="Frequently asked questions">
      <div className="flex flex-col gap-4">
        {FAQS.map((faq) => (
          <details key={faq.q} className="group rounded-2xl border border-surface-border bg-surface p-5">
            <summary className="cursor-pointer list-none font-semibold marker:hidden">
              {faq.q}
            </summary>
            <p className="mt-2 text-sm text-muted">{faq.a}</p>
          </details>
        ))}
      </div>
    </ProsePage>
  );
}
