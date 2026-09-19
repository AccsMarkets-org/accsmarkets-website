import { Metadata } from "next";
import { CareerClient } from "./CareerClient";

export const revalidate = 86400;

export const metadata: Metadata = { title: "Careers — AccsMarkets", description: "Join the team building the future of secure account trading." };

export default function CareerPage() {
  return <CareerClient />;
}
