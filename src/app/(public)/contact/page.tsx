import { Metadata } from "next";
import ContactClient from "./ContactClient";

export const metadata: Metadata = { title: "Contact — AccsMarkets", description: "Get in touch with our team." };

export default function ContactPage() {
  return <ContactClient />;
}
