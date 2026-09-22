import { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { ArrowRight, LifeBuoy } from "lucide-react";
import { authOptions } from "@/lib/auth";
import ContactClient from "./ContactClient";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with the AccsMarkets team for help with an escrow, a dispute, your account or a partnership. We respond within 24 hours on business days.",
  alternates: { canonical: "/contact" },
};

export default async function ContactPage() {
  const session = await getServerSession(authOptions);

  return (
    <>
      {session?.user && (
        <div className="mx-auto max-w-5xl px-4 pt-8 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-200 bg-brand-50 px-5 py-4 dark:border-brand-900/50 dark:bg-brand-950/30">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-600 dark:bg-brand-900/50 dark:text-brand-400">
                <LifeBuoy className="h-4 w-4" aria-hidden />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">You&apos;re signed in — open a support ticket instead</p>
                <p className="text-xs text-muted">Tickets are tracked in your dashboard, can link to an escrow or listing, and get faster replies.</p>
              </div>
            </div>
            <Link
              href="/dashboard/support/new"
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2 text-sm font-bold text-white transition hover:bg-brand-600"
            >
              Open a ticket
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>
        </div>
      )}
      <ContactClient />
    </>
  );
}
