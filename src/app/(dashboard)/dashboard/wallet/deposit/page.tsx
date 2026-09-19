import { DepositWidget } from "@/components/wallet/DepositWidget";

export default function DepositPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col gap-6">
      <h1 className="text-2xl font-bold">Add funds</h1>
      <DepositWidget />
    </div>
  );
}
