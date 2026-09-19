import { MarketingClient } from "./MarketingClient";

export default function AdminMarketingPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Marketing</h1>
      <MarketingClient />
    </div>
  );
}
