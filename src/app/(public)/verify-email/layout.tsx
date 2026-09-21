import { Metadata } from "next";

// page.tsx is a client component and can't export metadata itself.
export const metadata: Metadata = {
  title: "Verify Email",
  description: "Confirm the email address on your AccsMarkets account to finish signing up and start buying and selling with escrow protection.",
  alternates: { canonical: "/verify-email" },
  robots: { index: false, follow: false },
};

export default function VerifyEmailLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
