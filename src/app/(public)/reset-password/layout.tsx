import { Metadata } from "next";

// page.tsx is a client component and can't export metadata itself.
export const metadata: Metadata = {
  title: "Reset Password",
  description: "Choose a new password for your AccsMarkets account using the secure, time-limited reset link we sent to your email address.",
  alternates: { canonical: "/reset-password" },
  robots: { index: false, follow: false },
};

export default function ResetPasswordLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
