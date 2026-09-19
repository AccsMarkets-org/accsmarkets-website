import { readFileSync } from "fs";
import path from "path";

const TEMPLATE_DIR = path.join(process.cwd(), "src", "lib", "email-html");

export const appUrl = () => process.env.NEXTAUTH_URL ?? "https://accsmarkets.org";

function globalVars(): Record<string, string> {
  const base = appUrl();
  return {
    site_url: base,
    logo_url: `${base}/logo.png`,
    current_year: String(new Date().getFullYear()),
    help_url: `${base}/faq`,
    privacy_url: `${base}/privacy`,
    terms_url: `${base}/terms`,
    support_url: `${base}/contact`,
    company_address: "AccsMarkets · accsmarkets.org",
    dashboard_url: `${base}/dashboard`,
    security_url: `${base}/dashboard/settings/security`,
    kyc_url: `${base}/dashboard/settings/verification`,
    wallet_url: `${base}/dashboard/wallet`,
    billing_url: `${base}/dashboard/settings/subscription`,
    subscription_url: `${base}/dashboard/settings/subscription`,
    plan_url: `${base}/pricing`,
  };
}

export function renderTemplate(slug: string, vars: Record<string, string>): string {
  const filePath = path.join(TEMPLATE_DIR, `${slug}.html`);
  let html = readFileSync(filePath, "utf-8");
  const allVars = { ...globalVars(), ...vars };
  for (const [key, value] of Object.entries(allVars)) {
    html = html.split(`{{${key}}}`).join(value ?? "");
  }
  // Remove any unfilled placeholders
  return html.replace(/\{\{[^}]+\}\}/g, "");
}

function nowLabel(): string {
  return new Date().toUTCString();
}

export { nowLabel };
