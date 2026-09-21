import { Metadata } from "next";
import { CareerClient } from "./CareerClient";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Careers",
  description: "Join the AccsMarkets team building the future of secure, escrow-protected social media account trading. Open positions are listed here.",
  alternates: { canonical: "/career" },
};

export default function CareerPage() {
  return <CareerClient />;
}
