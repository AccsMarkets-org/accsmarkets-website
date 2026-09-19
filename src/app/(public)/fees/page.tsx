import { ProsePage } from "@/components/ui/ProsePage";
import { prisma } from "@/lib/db";

export const metadata = { title: "Fees — AccsMarkets" };
export const revalidate = 300;

export default async function FeesPage() {
  const plans = await prisma.subscriptionPlan.findMany({ orderBy: { priceMonthly: "asc" } }).catch(() => []);

  const exampleParty = plans.find((p) => p.name.toUpperCase() === "PRO") ?? plans[Math.floor(plans.length / 2)];
  const exampleFeeRate = exampleParty ? Number(exampleParty.escrowFeeRate) : 0.03;
  const exampleMinFee = exampleParty ? Number(exampleParty.minFee) : 3;
  const exampleFee = Math.max(500 * exampleFeeRate, exampleMinFee);

  return (
    <ProsePage title="Fees" subtitle="Flat, published, no surprises.">
      <h2>Escrow fee (paid by the buyer)</h2>
      <p>
        When a buyer funds an escrow, they pay the sale price plus an escrow fee. The fee rate
        depends on the <em>seller&apos;s</em> subscription plan — better plans make listings
        cheaper to buy. The seller always receives the full sale price.
      </p>
      {plans.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-surface-border text-left">
                <th className="py-2 pr-4">Plan</th>
                <th className="py-2 pr-4">Price</th>
                <th className="py-2 pr-4">Active listings</th>
                <th className="py-2 pr-4">Escrow fee</th>
                <th className="py-2">Minimum fee</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((p) => (
                <tr key={p.id} className="border-b border-surface-border">
                  <td className="py-2 pr-4 font-semibold">{p.name.toUpperCase()}</td>
                  <td className="py-2 pr-4">${Number(p.priceMonthly).toFixed(Number(p.priceMonthly) % 1 === 0 ? 0 : 2)}/mo</td>
                  <td className="py-2 pr-4">{p.listingLimit === 0 ? "Unlimited" : p.listingLimit}</td>
                  <td className="py-2 pr-4">{(Number(p.escrowFeeRate) * 100).toFixed(0)}%</td>
                  <td className="py-2">${Number(p.minFee).toFixed(0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {exampleParty && (
        <>
          <h2>Example</h2>
          <p>
            A $500 listing from a {exampleParty.name.toUpperCase()} seller: the buyer pays $500 + max($500 × {(exampleFeeRate * 100).toFixed(0)}%, ${exampleMinFee.toFixed(0)}) = <strong>${(500 + exampleFee).toFixed(0)}</strong>.
            The seller receives <strong>$500</strong>. The platform keeps ${exampleFee.toFixed(0)}.
          </p>
        </>
      )}
      <h2>Deposits &amp; withdrawals</h2>
      <ul>
        <li>Crypto deposits: no platform fee (network fees apply).</li>
        <li>Withdrawals: minimum $20, reviewed manually, no platform fee.</li>
        <li>Full refund — including the escrow fee — if a funded escrow is cancelled before handover.</li>
      </ul>
    </ProsePage>
  );
}
