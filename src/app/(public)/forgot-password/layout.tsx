import { Metadata } from "next";

// page.tsx is a client component and can't export metadata itself.
export const metadata: Metadata = {
  title: "Forgot Password",
  description: "Forgot your AccsMarkets password? Enter your account email and we'll send you a secure link to reset it and get back into your account.",
  alternates: { canonical: "/forgot-password" },
  robots: { index: false, follow: false },
};

export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
