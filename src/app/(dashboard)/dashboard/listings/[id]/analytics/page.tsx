import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getListingAnalytics } from "@/app/api/listings/_lib/analytics";
import { CountryFlag } from "@/components/ui/CountryFlag";
import { Button } from "@/components/ui/Button";
import { ListingAnalyticsChart, BoostCta } from "@/components/listings/ListingAnalyticsClient";
import { LISTING_STATUS_STYLE, PLATFORM_COLOR, PLATFORM_LABEL } from "@/lib/constants";
import { countryName, formatCurrency, formatNumber } from "@/lib/utils";
import { ArrowLeft, BarChart3, Eye, Globe, Handshake, Heart, ShieldCheck, Users } from "lucide-react";

export const metadata = { title: "Listing analytics" };

export default async function ListingAnalyticsPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const listing = await prisma.listing.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      title: true,
      platform: true,
      status: true,
      price: true,
      createdAt: true,
      isFeatured: true,
      isPremiumFeatured: true,
      isPinned: true,
      sellerId: true,
    },
  });
  if (!listing || listing.sellerId !== session!.user.id) notFound();

  const data = await getListingAnalytics(listing.id);
  if (!data) notFound();

  const style = LISTING_STATUS_STYLE[listing.status];
  const platformColor = PLATFORM_COLOR[listing.platform];
  const boosted = listing.isFeatured || listing.isPremiumFeatured || listing.isPinned;
  const maxCountry = data.byCountry[0]?.views ?? 1;

  const kpis = [
    { label: "Total views", value: formatNumber(data.views), sub: `${data.daysActive}d listed`, icon: Eye, color: "text-brand-600 dark:text-brand-400", bg: "bg-brand-500/10" },
    { label: "Unique visitors", value: formatNumber(data.uniqueViews), sub: data.views > 0 ? `${Math.round((data.uniqueViews / data.views) * 100)}% of views` : "—", icon: Users, color: "text-info", bg: "bg-info/10" },
    { label: "Watchlist adds", value: formatNumber(data.watchlistAdds), sub: "buyers watching", icon: Heart, color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-500/10" },
    { label: "Offers", value: formatNumber(data.offers), sub: `${data.conversion.viewToOffer}% of visitors`, icon: Handshake, color: "text-warning", bg: "bg-warning/10" },
    { label: "Escrows", value: formatNumber(data.escrows), sub: `${data.conversion.offerToEscrow}% of offers`, icon: ShieldCheck, color: "text-success", bg: "bg-success/10" },
  ];

  return (
    <div className="flex flex-col gap-5 pb-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href="/dashboard/listings"
            className="mb-1 inline-flex items-center gap-1 text-xs text-muted hover:text-foreground transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            My listings
          </Link>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <BarChart3 className="h-6 w-6 text-brand-500" aria-hidden />
            Analytics
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-bold"
              style={{ background: `${platformColor}18`, color: platformColor }}
            >
              {PLATFORM_LABEL[listing.platform]}
            </span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${style.className}`}>{style.label}</span>
            <span className="truncate font-medium text-foreground">{listing.title}</span>
            <span className="text-muted">&middot; {formatCurrency(listing.price.toString())}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/dashboard/listings/${listing.id}/edit`}>
            <Button variant="outline" size="sm">Edit</Button>
          </Link>
          {listing.status === "ACTIVE" && (
            <Link href={`/listings/${listing.id}`} target="_blank">
              <Button variant="outline" size="sm">View public</Button>
            </Link>
          )}
        </div>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-2xl border border-surface-border bg-surface px-4 py-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted">{k.label}</p>
              <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${k.bg} ${k.color}`}>
                <k.icon className="h-4 w-4" strokeWidth={1.75} aria-hidden />
              </span>
            </div>
            <p className={`mt-1 text-2xl font-bold ${k.color}`}>{k.value}</p>
            <p className="text-[11px] text-muted">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Funnel */}
      <div className="rounded-2xl border border-surface-border bg-surface px-4 py-3">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted">Conversion funnel</p>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-lg bg-brand-500/10 px-2.5 py-1 font-semibold text-brand-600 dark:text-brand-400">
            {formatNumber(data.uniqueViews || data.views)} visitors
          </span>
          <span className="text-muted">→ {data.conversion.viewToOffer}% →</span>
          <span className="rounded-lg bg-warning/10 px-2.5 py-1 font-semibold text-warning">{data.offers} offers</span>
          <span className="text-muted">→ {data.conversion.offerToEscrow}% →</span>
          <span className="rounded-lg bg-success/10 px-2.5 py-1 font-semibold text-success">{data.escrows} escrows</span>
          {data.sold && (
            <span className="ml-auto rounded-lg bg-brand-100 px-2.5 py-1 text-xs font-bold text-brand-700">Sold</span>
          )}
        </div>
      </div>

      <BoostCta listingId={listing.id} status={listing.status} boosted={boosted} />

      {/* Chart + countries */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="rounded-2xl border border-surface-border bg-surface p-4 lg:col-span-2">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted">Views · last 30 days</p>
          <ListingAnalyticsChart byDay={data.byDay} />
        </div>

        <div className="rounded-2xl border border-surface-border bg-surface p-4">
          <p className="mb-3 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted">
            <Globe className="h-3.5 w-3.5" aria-hidden />
            Visitors by country
          </p>
          {data.byCountry.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted">
              Country data appears as visitors arrive.
            </p>
          ) : (
            <table className="w-full text-sm">
              <tbody className="divide-y divide-surface-border">
                {data.byCountry.map((row) => (
                  <tr key={row.country}>
                    <td className="py-2 pr-2">
                      <div className="flex items-center gap-2">
                        <CountryFlag code={row.country} className="w-6 h-auto rounded-sm shrink-0" />
                        <span className="truncate text-xs font-medium text-foreground">{countryName(row.country)}</span>
                      </div>
                      <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-surface-border">
                        <div
                          className="h-1 rounded-full bg-brand-500"
                          style={{ width: `${Math.round((row.views / maxCountry) * 100)}%` }}
                        />
                      </div>
                    </td>
                    <td className="py-2 text-right text-xs font-bold text-foreground align-top">{row.views}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
