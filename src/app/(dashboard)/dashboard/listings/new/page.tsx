import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { ListingWizard } from "@/components/listings/ListingWizard";
import { ArrowRight, Check, Lock } from "lucide-react";

async function getReviewHours(): Promise<number> {
  const settings = await prisma.platformSettings.findUnique({
    where: { id: "singleton" },
    select: { listingReviewHours: true },
  }).catch(() => null);
  return settings?.listingReviewHours ?? 48;
}

export default async function NewListingPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login?callbackUrl=/dashboard/listings/new");
  const reviewHours = await getReviewHours();

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: { kycLevel: true, email: true },
  });

  const verified = user.kycLevel !== "NONE" && user.kycLevel !== "EMAIL";

  if (!verified) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <h1 className="text-2xl font-bold">Create a listing</h1>
        <VerificationGate kycLevel={user.kycLevel} />
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-bold">Create a listing</h1>
      <ListingWizard reviewHours={reviewHours} />
    </div>
  );
}

function VerificationGate({ kycLevel }: { kycLevel: string }) {
  const steps = [
    { label: "Email", done: true },
    { label: "Phone", done: kycLevel === "PHONE" || kycLevel === "ID_VERIFIED" },
    { label: "ID", done: kycLevel === "ID_VERIFIED" },
  ];

  return (
    <div className="flex flex-col items-center gap-6 rounded-2xl border border-surface-border bg-surface px-8 py-12 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 text-brand-600 dark:bg-brand-900/50 dark:text-brand-400">
        <Lock className="h-8 w-8" strokeWidth={1.5} aria-hidden />
      </div>

      <div>
        <h2 className="text-xl font-bold">Verify your account to start selling</h2>
        <p className="mt-2 max-w-sm text-sm text-muted">
          Account verification protects buyers and builds trust on the marketplace. Verified sellers
          convert 3× better and get faster listing approvals.
        </p>
      </div>

      {/* Step tracker */}
      <div className="flex w-full max-w-xs items-center justify-between">
        {steps.map((step, i) => (
          <div key={step.label} className="flex flex-1 items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                  step.done
                    ? "bg-success text-white"
                    : "border-2 border-surface-border bg-background text-muted"
                }`}
              >
                {step.done ? <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden /> : i + 1}
              </div>
              <span className={`text-xs ${step.done ? "text-success font-medium" : "text-muted"}`}>
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`mb-5 h-0.5 flex-1 ${step.done && steps[i + 1].done ? "bg-success" : "bg-surface-border"}`}
              />
            )}
          </div>
        ))}
      </div>

      <Link
        href="/dashboard/settings/verification"
        className="inline-flex items-center gap-1.5 rounded-xl bg-brand-500 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-600 transition"
      >
        Complete verification
        <ArrowRight className="h-4 w-4" aria-hidden />
      </Link>

      <p className="text-xs text-muted">
        Takes under 2 minutes · Your data is encrypted and never shared.
      </p>
    </div>
  );
}
