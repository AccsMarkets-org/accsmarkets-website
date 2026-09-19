import { writeFileSync } from "fs";
import {
  welcomeTemplate,
  escrowCompletedTemplate,
  offerAcceptedTemplate,
  listingRejectedTemplate,
  passwordChangedTemplate,
  kycApprovedTemplate,
  subscriptionActivatedTemplate,
  depositConfirmedTemplate,
  newMessageTemplate,
} from "../src/lib/email-templates";

const samples = [
  { label: "Welcome (brand + pulse)", t: welcomeTemplate("Jordan") },
  { label: "Escrow Completed (success + pulse)", t: escrowCompletedTemplate("Alex", "FullFlix Hindi 120K", "esc_001") },
  { label: "Offer Accepted (success + pulse)", t: offerAcceptedTemplate("Sam", "Fitness Instagram 50K") },
  { label: "KYC Approved (success + pulse)", t: kycApprovedTemplate("Jordan", "ID Verified") },
  { label: "Subscription Activated (brand + pulse)", t: subscriptionActivatedTemplate("Alex", "Pro", "Aug 1 2026") },
  { label: "Deposit Confirmed (success)", t: depositConfirmedTemplate("Sam", "$250.00") },
  { label: "New Message (info)", t: newMessageTemplate("Taylor", "Jordan", "Hey, is this account still available?") },
  { label: "Listing Rejected (warning)", t: listingRejectedTemplate("Sam", "Fitness Instagram 50K", "Photo quality too low — please upload clearer screenshots.") },
  { label: "Password Changed (danger + security footer)", t: passwordChangedTemplate("Taylor") },
];

const nav = samples.map((s, i) =>
  `<a href="#t${i}" style="font-family:sans-serif;font-size:12px;color:#3b82f6;text-decoration:none;display:block;padding:4px 0;">#${i + 1} ${s.label}</a>`
).join("");

const sections = samples.map(({ label, t }, i) =>
  `<div id="t${i}" style="border-top:4px solid #e5e7eb;margin-top:48px;padding-top:16px;">
    <h2 style="font-family:sans-serif;font-size:13px;color:#6b7280;margin:0 0 4px;font-weight:600;padding:0 24px;">${i + 1}. ${label}</h2>
    <p style="font-family:sans-serif;font-size:12px;color:#9ca3af;margin:0 0 16px;padding:0 24px;">Subject: ${t.subject}</p>
    ${t.html}
  </div>`
).join("\n");

const page = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Email Template Preview</title></head>
<body style="margin:0;padding:0;background:#e5e7eb;">
  <div style="position:fixed;top:0;left:0;width:220px;height:100vh;background:#fff;border-right:1px solid #e5e7eb;overflow-y:auto;padding:16px;box-sizing:border-box;z-index:999;">
    <strong style="font-family:sans-serif;font-size:13px;color:#111827;display:block;margin-bottom:12px;">Email Previews</strong>
    ${nav}
  </div>
  <div style="margin-left:220px;padding:24px;">
    ${sections}
  </div>
</body></html>`;

writeFileSync("preview.html", page);
console.log("✓ preview.html written —", samples.length, "templates");
