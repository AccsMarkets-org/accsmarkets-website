"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

export default function NotificationsError() {
  const router = useRouter();
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <p className="text-xl font-semibold">Failed to load notifications</p>
      <p className="text-sm text-muted">Something went wrong fetching your notifications.</p>
      <Button onClick={() => router.refresh()}>Retry</Button>
    </div>
  );
}
