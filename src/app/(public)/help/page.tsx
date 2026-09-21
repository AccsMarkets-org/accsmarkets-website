import { HelpCenterClient } from "./HelpCenterClient";

const BASE_URL = "https://accsmarkets.org";

export const metadata = {
  title: "Help Center",
  description: "Search answers on buying, selling, escrow, payments, disputes, and account security on AccsMarkets.",
  alternates: { canonical: `${BASE_URL}/help` },
  openGraph: {
    title: "Help Center — AccsMarkets",
    description: "Search answers on buying, selling, escrow, payments, disputes, and account security.",
    url: `${BASE_URL}/help`,
    images: [{ url: "/og-default.png", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" as const, title: "Help Center — AccsMarkets" },
};

export default function HelpCenterPage() {
  return <HelpCenterClient />;
}
