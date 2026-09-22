import { renderTemplate, appUrl, nowLabel } from "./email-render";

interface EmailContent {
  subject: string;
  html: string;
}

// ─── Helpers kept for otpCodeTemplate / staffInviteTemplate / contactAutoReplyTemplate / adminNotifyTemplate
// (no HTML file in the template set for these four)

// Same visual language as the premium HTML file templates (email-html/*):
// 660px card, orange hero gradient, dark-mode support, #111827 footer.
const TONES = {
  brand:   { eyebrow: "ACCSMARKETS",        pill: "SECURE MARKETPLACE" },
  success: { eyebrow: "GOOD NEWS",          pill: "SECURE MARKETPLACE" },
  info:    { eyebrow: "ACCSMARKETS",        pill: "SECURE MARKETPLACE" },
  warning: { eyebrow: "ATTENTION NEEDED",   pill: "SECURE MARKETPLACE" },
  danger:  { eyebrow: "SECURITY",           pill: "SECURITY ALERT" },
} as const;

type Tone = keyof typeof TONES;

const EMAIL_FONT = "-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

const BASE_CSS = `
html,body{margin:0!important;padding:0!important;background:#f5f4f2!important}
table{border-spacing:0!important;border-collapse:collapse!important}
img{border:0;display:block;outline:none;text-decoration:none}
a{text-decoration:none}
.wrapper{width:100%;background:#f5f4f2}
.container{width:100%;max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 2px rgba(28,25,23,.06),0 12px 32px rgba(28,25,23,.07)}
.hero{background:#ffffff;border-top:4px solid #f97316}
.float{animation:float 3.2s ease-in-out infinite}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}
@media(prefers-reduced-motion:reduce){.float{animation:none!important}}
@media(max-width:640px){
  .pad{padding-left:20px!important;padding-right:20px!important}
  .headline{font-size:25px!important;line-height:1.2!important}
  .btn{display:block!important;text-align:center!important}
  .otp-code{font-size:34px!important;letter-spacing:8px!important}
}
@media(prefers-color-scheme:dark){
  body,.wrapper{background:#0c0a09!important}
  .container,.hero{background:#1c1917!important}
  .logo-text{color:#f5f5f4!important}
  .headline{color:#f5f5f4!important}
  .content-text{color:#e7e5e4!important}
  .muted{color:#a8a29e!important}
  .panel{background:#26211e!important;border-color:#332e2a!important}
  .panel td{color:#e7e5e4!important;border-color:#332e2a!important}
  .footer{background:#171412!important;border-color:#292524!important}
  .otp-box{background:#26211e!important;border-color:#7c2d12!important}
  .otp-code{color:#fb923c!important}
}`;

function preheader(text: string): string {
  return `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${text}</div>`;
}

function otpBlock(code: string): string {
  return `
<div class="otp-box" style="margin:26px 0 0;padding:28px 16px;background:#fff7ed;border:1px solid #fed7aa;border-radius:14px;text-align:center;">
  <div class="muted" style="font:700 11px ${EMAIL_FONT};letter-spacing:.16em;text-transform:uppercase;color:#a8a29e;margin-bottom:12px;">Your verification code</div>
  <div class="otp-code" style="font:800 42px/1 'SF Mono','Segoe UI Mono',Consolas,'Courier New',monospace;letter-spacing:10px;color:#ea580c;">${code}</div>
  <div class="muted" style="font:400 12px ${EMAIL_FONT};color:#a8a29e;margin-top:12px;">Expires in <strong>10 minutes</strong> — never share it with anyone</div>
</div>`;
}

interface LayoutOptions {
  preheaderText: string;
  emoji: string;
  tone: Tone;
  pulse?: boolean;
  heading: string;
  subheading?: string;
  body: string;
  details?: [string, string][];
  otp?: string;
  ctaText?: string;
  ctaUrl?: string;
  secondaryCtaText?: string;
  secondaryCtaUrl?: string;
  withSecurityFooter?: boolean;
  // Marketing/re-engagement sends only: adds the unsubscribe line to the footer.
  marketing?: boolean;
}

// Where the "Promotional emails" switch (User.marketingOptOut, via
// /api/settings/marketing-emails) lives. There is no tokenized one-click
// unsubscribe endpoint, so this is the working opt-out for marketing sends.
function marketingUnsubscribeUrl(): string {
  return `${appUrl()}/dashboard/settings/notifications`;
}

function baseLayout(opts: LayoutOptions): string {
  const t = TONES[opts.tone];
  const year = new Date().getFullYear();
  const base = appUrl();

  const detailRows = opts.details
    ? opts.details.map(([label, value], i) => `
    <tr>
      <td class="muted" style="padding:12px 18px;font:400 13px ${EMAIL_FONT};color:#78716c;${i > 0 ? "border-top:1px solid #e7e5e4;" : ""}">${label}</td>
      <td style="padding:12px 18px;font:700 13px ${EMAIL_FONT};color:#1c1917;text-align:right;${i > 0 ? "border-top:1px solid #e7e5e4;" : ""}">${value}</td>
    </tr>`).join("")
    : "";

  const securityBlock = opts.withSecurityFooter
    ? `<div style="margin-top:26px;padding:16px 20px;background:#fff1f2;border:1px solid #fecdd3;border-radius:12px;">
        <p style="margin:0;font:700 13px ${EMAIL_FONT};color:#be123c;">Wasn't you?</p>
        <p style="margin:6px 0 0;font:400 13px/1.6 ${EMAIL_FONT};color:#be123c;">If you didn't make this request, your account may be at risk.
        <a href="${base}/dashboard/settings/security" style="color:#be123c;font-weight:700;">Secure your account →</a></p>
      </div>`
    : "";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<meta name="x-apple-disable-message-reformatting">
<title>AccsMarkets</title>
<style>${BASE_CSS}</style>
</head>
<body>
${preheader(opts.preheaderText)}
<table role="presentation" class="wrapper" width="100%">
<tr><td align="center" style="padding:34px 12px">
<table role="presentation" class="container" width="660">

<tr><td class="hero pad" style="padding:26px 40px 24px">
<table role="presentation" width="100%">
<tr>
<td valign="middle"><a href="${base}" aria-label="AccsMarkets" style="display:inline-block"><table role="presentation"><tr><td valign="middle"><img src="${base}/logo.png" width="34" height="34" alt="" style="width:34px;height:34px;border-radius:8px"></td><td class="logo-text" valign="middle" style="padding-left:10px;font:800 17px ${EMAIL_FONT};color:#1c1917;letter-spacing:-.02em">AccsMarkets</td></tr></table></a></td>
<td align="right" valign="middle"><span style="display:inline-block;padding:6px 12px;border-radius:999px;background:#fff7ed;border:1px solid #fed7aa;color:#c2410c;font:700 11px ${EMAIL_FONT};letter-spacing:.08em">${t.pill}</span></td>
</tr></table>
</td></tr>

<tr><td class="pad" style="padding:26px 40px 8px">
<div style="color:#ea580c;font:700 12px ${EMAIL_FONT};letter-spacing:.14em">${t.eyebrow}</div>
<h1 class="headline" style="margin:10px 0 0;color:#1c1917;font:800 29px/1.2 ${EMAIL_FONT};letter-spacing:-.02em">${opts.heading}</h1>
${opts.subheading ? `<p class="muted" style="margin:10px 0 0;color:#78716c;font:600 15px ${EMAIL_FONT};">${opts.subheading}</p>` : ""}
<div class="content-text" style="margin-top:20px;color:#44403c;font:400 15px/1.75 ${EMAIL_FONT};">${opts.body}</div>
${opts.otp ? otpBlock(opts.otp) : ""}
${opts.details ? `<table role="presentation" class="panel" width="100%" style="margin:22px 0 0;background:#fafaf9;border:1px solid #e7e5e4;border-radius:12px;overflow:hidden;"><tbody>${detailRows}</tbody></table>` : ""}
${securityBlock}
</td></tr>

${opts.ctaText && opts.ctaUrl ? `
<tr><td class="pad" style="padding:28px 40px 4px" align="center">
<table role="presentation"><tr><td bgcolor="#f97316" style="border-radius:12px">
<a class="btn" href="${opts.ctaUrl}" style="display:inline-block;padding:14px 38px;color:#fff;font:700 15px ${EMAIL_FONT};border-radius:12px">${opts.ctaText} &nbsp;→</a>
</td></tr></table>
${opts.secondaryCtaText && opts.secondaryCtaUrl ? `<div style="margin-top:14px;"><a href="${opts.secondaryCtaUrl}" class="muted" style="font:400 13px ${EMAIL_FONT};color:#78716c;text-decoration:underline;">${opts.secondaryCtaText}</a></div>` : ""}
</td></tr>` : ""}

<tr><td class="pad" style="padding:26px 40px 30px">
<div class="panel" style="padding:14px 18px;background:#fafaf9;border:1px solid #e7e5e4;border-radius:12px;">
<p class="muted" style="margin:0;font:400 12px/1.7 ${EMAIL_FONT};color:#78716c;">
<strong style="color:#44403c">Security notice:</strong> AccsMarkets staff will never ask for your password, backup codes, or two-factor authentication codes.
</p>
</div>
</td></tr>

<tr><td class="footer" style="background:#fafaf9;border-top:1px solid #f0eeec;padding:26px 32px;text-align:center">
<p style="margin:0;font:800 13px ${EMAIL_FONT};color:#57534e;letter-spacing:-.01em">AccsMarkets</p>
<p style="margin:8px 0 0;font:400 12px/1.9 ${EMAIL_FONT};color:#a8a29e">
<a href="${base}/faq" style="color:#78716c">Help Center</a> &nbsp;·&nbsp; <a href="${base}/privacy" style="color:#78716c">Privacy</a> &nbsp;·&nbsp; <a href="${base}/terms" style="color:#78716c">Terms</a> &nbsp;·&nbsp; <a href="${base}/contact" style="color:#78716c">Support</a><br>
${process.env.SUPPORT_PHONE
  ? `<a href="tel:${process.env.SUPPORT_PHONE}" style="color:#a8a29e">${process.env.SUPPORT_PHONE}</a> &nbsp;·&nbsp; `
  : ""}<a href="mailto:support@accsmarkets.org" style="color:#a8a29e">support@accsmarkets.org</a>
</p>
<p style="margin:10px 0 0;font:400 11px/1.6 ${EMAIL_FONT};color:#c2bcb6">© ${year} AccsMarkets — escrow-protected account marketplace</p>
${opts.marketing ? `<p style="margin:10px 0 0;font:400 11px/1.6 ${EMAIL_FONT};color:#a8a29e">You're receiving this because you have an AccsMarkets account and promotional emails are turned on. <a href="${marketingUnsubscribeUrl()}" style="color:#78716c;text-decoration:underline">Unsubscribe</a> &nbsp;·&nbsp; <a href="${marketingUnsubscribeUrl()}" style="color:#78716c;text-decoration:underline">Manage email preferences</a></p>` : ""}
</td></tr>

</table>
</td></tr></table>
</body></html>`;
}

// ─── Existing templates (rewritten to use HTML template files) ────────────────

export function welcomeTemplate(name: string): EmailContent {
  return {
    subject: "Welcome to AccsMarkets — Your Account Is Ready",
    html: renderTemplate("welcome", {
      user_name: name,
      user_email: "",
      created_at: new Date().toLocaleDateString("en-US", { dateStyle: "long" }),
      profile_url: `${appUrl()}/dashboard/settings`,
    }),
  };
}

export function emailVerifyTemplate(name: string, token: string): EmailContent {
  return {
    subject: "Verify Your Email Address — AccsMarkets",
    html: renderTemplate("email_verification", {
      user_name: name,
      verification_url: `${appUrl()}/verify-email?token=${token}`,
      expiry_minutes: "1440",
      ip_address: "Unknown",
    }),
  };
}

export function passwordResetTemplate(name: string, token: string, ipAddress = "Unknown"): EmailContent {
  return {
    subject: "Reset Your AccsMarkets Password",
    html: renderTemplate("password_reset", {
      user_name: name,
      reset_url: `${appUrl()}/reset-password?token=${token}`,
      expiry_minutes: "60",
      ip_address: ipAddress,
    }),
  };
}

export function passwordChangedTemplate(name: string): EmailContent {
  return {
    subject: "Your AccsMarkets Password Was Changed",
    html: renderTemplate("password_changed", {
      user_name: name,
      changed_at: nowLabel(),
      device_name: "Unknown",
      ip_address: "Unknown",
    }),
  };
}

export function listingApprovedTemplate(name: string, listingTitle: string, listingId: string): EmailContent {
  return {
    subject: `Listing Approved — ${listingTitle} Is Live`,
    html: renderTemplate("listing_approved", {
      user_name: name,
      listing_title: listingTitle,
      listing_id: listingId,
      listing_url: `${appUrl()}/listings/${listingId}`,
      listing_edit_url: `${appUrl()}/dashboard/listings`,
      approved_at: new Date().toLocaleDateString("en-US", { dateStyle: "long" }),
      asking_price: "",
    }),
  };
}

export function listingRejectedTemplate(name: string, listingTitle: string, reason: string): EmailContent {
  return {
    subject: "Action Required — Listing Needs Changes",
    html: renderTemplate("listing_rejected", {
      user_name: name,
      listing_title: listingTitle,
      listing_id: "",
      listing_edit_url: `${appUrl()}/dashboard/listings`,
      rejection_reason: reason,
      listing_rules_url: `${appUrl()}/faq`,
    }),
  };
}

export function offerReceivedTemplate(name: string, listingTitle: string, amount: string): EmailContent {
  return {
    subject: `New Offer Received for ${listingTitle}`,
    html: renderTemplate("offer_received", {
      seller_name: name,
      listing_title: listingTitle,
      offer_amount: amount,
      buyer_name: "A buyer",
      offer_url: `${appUrl()}/dashboard/offers`,
      conversation_url: `${appUrl()}/dashboard/messages`,
      offer_expires_at: "",
      asking_price: "",
    }),
  };
}

export function offerAcceptedTemplate(name: string, listingTitle: string, offerAmount = "", sellerName = "The seller"): EmailContent {
  return {
    subject: "Offer Accepted — Start the Protected Transaction",
    html: renderTemplate("offer_accepted", {
      user_name: name,
      buyer_name: name,
      listing_title: listingTitle,
      offer_amount: offerAmount,
      offer_url: `${appUrl()}/dashboard/offers`,
      // No /escrows/new route exists — funding starts from the accepted offer.
      escrow_create_url: `${appUrl()}/dashboard/offers`,
      seller_name: sellerName,
    }),
  };
}

export function escrowFundedTemplate(name: string, listingTitle: string, amount: string, escrowId: string): EmailContent {
  return {
    subject: "Escrow Funded — You May Begin the Transfer",
    html: renderTemplate("escrow_funded", {
      user_name: name,
      listing_title: listingTitle,
      amount,
      escrow_id: escrowId,
      escrow_url: `${appUrl()}/dashboard/escrows/${escrowId}`,
      conversation_url: `${appUrl()}/dashboard/messages`,
      transfer_deadline: "72 hours",
    }),
  };
}

export function escrowCreatedTemplate(
  name: string,
  listingTitle: string,
  amount: string,
  escrowId: string,
  buyerName = "A buyer",
  sellerName = "The seller",
): EmailContent {
  return {
    subject: `Escrow Created — ${escrowId}`,
    html: renderTemplate("escrow_created", {
      user_name: name,
      listing_title: listingTitle,
      amount,
      escrow_id: escrowId,
      escrow_url: `${appUrl()}/dashboard/escrows/${escrowId}`,
      buyer_name: buyerName,
      seller_name: sellerName,
      escrow_rules_url: `${appUrl()}/faq`,
    }),
  };
}

export function escrowCompletedTemplate(name: string, listingTitle: string, escrowId: string, amount = ""): EmailContent {
  return {
    subject: "Escrow Completed — Transaction Successful",
    html: renderTemplate("escrow_completed", {
      user_name: name,
      listing_title: listingTitle,
      escrow_id: escrowId,
      escrow_url: `${appUrl()}/dashboard/escrows/${escrowId}`,
      amount,
      completed_at: new Date().toLocaleDateString("en-US", { dateStyle: "long" }),
      recipient_name: name,
      // No /dashboard/reviews route — reviews are left from the escrow page.
      review_url: `${appUrl()}/dashboard/escrows/${escrowId}`,
    }),
  };
}

export function depositConfirmedTemplate(name: string, amount: string, newBalance = "", paymentMethod = "", transactionId = ""): EmailContent {
  return {
    subject: "Deposit Confirmed — Funds Added",
    html: renderTemplate("deposit_confirmed", {
      user_name: name,
      amount,
      new_balance: newBalance,
      payment_method: paymentMethod,
      transaction_id: transactionId,
      receipt_url: `${appUrl()}/dashboard/wallet`,
    }),
  };
}

export function kycApprovedTemplate(name: string, level: string): EmailContent {
  return {
    subject: "Identity Verification Approved",
    html: renderTemplate("kyc_approved", {
      user_name: name,
      verification_level: level,
      approved_at: new Date().toLocaleDateString("en-US", { dateStyle: "long" }),
      profile_url: `${appUrl()}/dashboard/settings`,
    }),
  };
}

export function kycRejectedTemplate(name: string, reason: string, caseId = ""): EmailContent {
  return {
    subject: "Identity Verification Needs Attention",
    html: renderTemplate("kyc_rejected", {
      user_name: name,
      rejection_reason: reason,
      case_id: caseId,
    }),
  };
}

export function subscriptionActivatedTemplate(name: string, planName: string, expiresAt: string, planPrice = "", billingCycle = ""): EmailContent {
  return {
    subject: `${planName} Activated — Your Plan Is Live`,
    html: renderTemplate("subscription_activated", {
      user_name: name,
      plan_name: planName,
      plan_price: planPrice,
      billing_cycle: billingCycle,
      renewal_date: expiresAt,
    }),
  };
}

export function newMessageTemplate(name: string, senderName: string, preview: string): EmailContent {
  return {
    subject: `New Message from ${senderName}`,
    html: renderTemplate("new_message", {
      sender_name: senderName,
      message_preview: preview,
      conversation_url: `${appUrl()}/dashboard/messages`,
      conversation_subject: "New message",
      received_at: nowLabel(),
      related_transaction_url: "",
    }),
  };
}

export function disputeOutcomeTemplate(
  name: string,
  won: boolean,
  listingTitle: string,
  escrowId: string,
  outcomeMessage: string,
): EmailContent {
  return {
    subject: `Dispute Decision — ${won ? "Resolved in Your Favour" : "Case Closed"}`,
    html: renderTemplate("dispute_outcome", {
      user_name: name,
      outcome: won ? "Won" : "Not upheld",
      dispute_id: "",
      decision_summary: outcomeMessage,
      resolution_amount: "",
      decision_date: new Date().toLocaleDateString("en-US", { dateStyle: "long" }),
      dispute_url: `${appUrl()}/dashboard/escrows/${escrowId}`,
    }),
  };
}

// ─── Templates without HTML files — kept using baseLayout ────────────────────

export function otpCodeTemplate(code: string): EmailContent {
  return {
    subject: "Your AccsMarkets verification code",
    html: baseLayout({
      preheaderText: `Your one-time code is ${code}. Expires in 10 minutes.`,
      emoji: "🔢",
      tone: "brand",
      heading: "Verification code",
      body: `<p>Use the code below to complete your verification. Do not share this code with anyone.</p>`,
      otp: code,
      withSecurityFooter: true,
    }),
  };
}

export function staffInviteTemplate(inviterName: string, roleName: string, signupUrl: string): EmailContent {
  return {
    subject: "You've been invited to join AccsMarkets as staff",
    html: baseLayout({
      preheaderText: `${inviterName} invited you to join the AccsMarkets team as ${roleName}.`,
      emoji: "👥",
      tone: "brand",
      pulse: true,
      heading: "You're invited to the team",
      subheading: `Role: ${roleName}`,
      body: `<p><strong>${inviterName}</strong> has invited you to join AccsMarkets as a staff member.</p>
<p>Click below to accept. This invitation expires in <strong>7 days</strong>.</p>
<p style="font-size:13px;color:#6b7280;">If you didn't expect this, you can safely ignore it.</p>`,
      ctaText: "Accept invitation",
      ctaUrl: signupUrl,
    }),
  };
}

export function contactAutoReplyTemplate(name: string, subject: string): EmailContent {
  return {
    subject: "We received your message — AccsMarkets",
    html: baseLayout({
      preheaderText: "Our team will get back to you within 24–48 hours.",
      emoji: "📨",
      tone: "info",
      heading: "Message received",
      subheading: "We'll be in touch soon.",
      body: `<p>Hi ${name},</p>
<p>Thanks for reaching out. We received your message about <strong>"${subject}"</strong> and our support team will reply within <strong>24–48 hours</strong>.</p>
<p>In the meantime, check our FAQ — it answers most common questions instantly.</p>`,
      ctaText: "Browse FAQ",
      ctaUrl: `${appUrl()}/faq`,
    }),
  };
}

export function contactReplyTemplate(name: string, originalSubject: string, replyBody: string): EmailContent {
  const escaped = replyBody.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\n/g, "<br/>");
  return {
    subject: `Re: ${originalSubject}`,
    html: baseLayout({
      preheaderText: replyBody.substring(0, 100),
      emoji: "💬",
      tone: "info",
      heading: "Reply from AccsMarkets Support",
      body: `<p>Hi ${name},</p>${escaped}<p style="margin-top:16px;font-size:13px;color:#6b7280;">— AccsMarkets Support Team</p>`,
      ctaText: "Visit AccsMarkets",
      ctaUrl: appUrl(),
    }),
  };
}

export function adminNotifyTemplate(userName: string, title: string, body: string): EmailContent {
  return {
    subject: title,
    html: baseLayout({
      preheaderText: body.substring(0, 100),
      emoji: "📣",
      tone: "info",
      heading: title,
      body: `<p>Hi ${userName},</p><p>${body}</p>`,
      ctaText: "View your dashboard",
      ctaUrl: `${appUrl()}/dashboard`,
    }),
  };
}

// ─── New templates (from the HTML template set) ───────────────────────────────

export function loginAlertTemplate(
  name: string,
  deviceName: string,
  ipAddress: string,
  location: string,
  loginAt: string,
): EmailContent {
  return {
    subject: "New Login Detected on Your AccsMarkets Account",
    html: renderTemplate("login_alert", {
      user_name: name,
      device_name: deviceName,
      ip_address: ipAddress,
      location,
      login_at: loginAt,
      reset_url: `${appUrl()}/reset-password`,
    }),
  };
}

export function kycSubmittedTemplate(name: string, submissionId: string, submittedAt: string): EmailContent {
  return {
    subject: "Identity Verification Submitted",
    html: renderTemplate("kyc_submitted", {
      user_name: name,
      submission_id: submissionId,
      submitted_at: submittedAt,
      review_eta: "1–2 business days",
    }),
  };
}

export function listingSubmittedTemplate(
  name: string,
  listingTitle: string,
  listingId: string,
  platformName: string,
  submittedAt: string,
): EmailContent {
  return {
    subject: `Listing Submitted — ${listingTitle}`,
    html: renderTemplate("listing_submitted", {
      user_name: name,
      listing_title: listingTitle,
      listing_id: listingId,
      listing_url: `${appUrl()}/listings/${listingId}`,
      listing_edit_url: `${appUrl()}/dashboard/listings`,
      platform_name: platformName,
      submitted_at: submittedAt,
    }),
  };
}

export function withdrawalRequestedTemplate(
  name: string,
  amount: string,
  withdrawalId: string,
  destinationMasked: string,
  requestedAt: string,
): EmailContent {
  return {
    subject: "Withdrawal Request Received",
    html: renderTemplate("withdrawal_requested", {
      user_name: name,
      amount,
      withdrawal_id: withdrawalId,
      destination_masked: destinationMasked,
      requested_at: requestedAt,
      withdrawal_url: `${appUrl()}/dashboard/wallet`,
    }),
  };
}

export function withdrawalCompletedTemplate(
  name: string,
  amount: string,
  withdrawalId: string,
  destinationMasked: string,
  completedAt: string,
): EmailContent {
  return {
    subject: "Withdrawal Completed",
    html: renderTemplate("withdrawal_completed", {
      user_name: name,
      amount,
      withdrawal_id: withdrawalId,
      destination_masked: destinationMasked,
      completed_at: completedAt,
      withdrawal_url: `${appUrl()}/dashboard/wallet`,
    }),
  };
}

export function escrowActionRequiredTemplate(
  name: string,
  escrowId: string,
  actionTitle: string,
  requiredAction: string,
  actionButtonText: string,
  actionDeadline: string,
): EmailContent {
  return {
    subject: `Action Required for Escrow ${escrowId}`,
    html: renderTemplate("escrow_action_required", {
      user_name: name,
      escrow_id: escrowId,
      action_title: actionTitle,
      required_action: requiredAction,
      action_button_text: actionButtonText,
      action_deadline: actionDeadline,
      escrow_url: `${appUrl()}/dashboard/escrows/${escrowId}`,
    }),
  };
}

export function disputeOpenedTemplate(
  name: string,
  disputeId: string,
  escrowId: string,
  disputeReason: string,
  evidenceDeadline: string,
): EmailContent {
  return {
    subject: `Dispute Opened — Case ${disputeId}`,
    html: renderTemplate("dispute_opened", {
      user_name: name,
      dispute_id: disputeId,
      escrow_id: escrowId,
      dispute_reason: disputeReason,
      evidence_deadline: evidenceDeadline,
      // Disputes are handled on the escrow page — /dashboard/disputes/[id] doesn't exist.
      dispute_url: `${appUrl()}/dashboard/escrows/${escrowId}`,
      dispute_policy_url: `${appUrl()}/faq`,
    }),
  };
}

export function subscriptionRenewalReminderTemplate(
  name: string,
  planName: string,
  renewalDate: string,
  renewalAmount: string,
  paymentMethodMasked: string,
): EmailContent {
  return {
    subject: "Upcoming AccsMarkets Subscription Renewal",
    html: renderTemplate("subscription_renewal_reminder", {
      user_name: name,
      plan_name: planName,
      renewal_date: renewalDate,
      renewal_amount: renewalAmount,
      payment_method_masked: paymentMethodMasked,
    }),
  };
}

export function adminHighRiskAlertTemplate(
  userId: string,
  riskCaseId: string,
  triggeredRule: string,
  riskScore: string,
  transactionId: string,
  detectedAt: string,
  ipAddress: string,
): EmailContent {
  return {
    subject: `[Admin] High-Risk Activity Detected — ${riskCaseId}`,
    html: renderTemplate("admin_high_risk_alert", {
      user_id: userId,
      risk_case_id: riskCaseId,
      triggered_rule: triggeredRule,
      risk_score: riskScore,
      transaction_id: transactionId,
      detected_at: detectedAt,
      ip_address: ipAddress,
      // /admin/risk is a list page — no per-case route exists.
      admin_risk_url: `${appUrl()}/admin/risk`,
      admin_user_url: `${appUrl()}/admin/users/${userId}`,
    }),
  };
}

// ─── Automated re-engagement campaigns (src/app/api/internal/marketing-sweep) ─
// All three respect User.marketingOptOut and are deduplicated/cooled-down via
// MarketingEmailLog — see that route for the actual sending logic.

export function newSignupNudgeTemplate(name: string): EmailContent {
  return {
    subject: "Ready to make your first move on AccsMarkets?",
    html: baseLayout({
      marketing: true,
      preheaderText: "Browse listings or create your first one — it only takes a couple of minutes.",
      emoji: "🚀",
      tone: "brand",
      heading: "Ready when you are",
      subheading: "Your account is set up — just no activity yet.",
      body: `<p>Hi ${name},</p>
<p>You joined AccsMarkets a few days ago but haven't browsed listings or created one yet. Everything's ready whenever you want to jump in — every deal here is escrow-protected, so funds are only released once the transfer is confirmed.</p>`,
      ctaText: "Browse listings",
      ctaUrl: `${appUrl()}/listings`,
      secondaryCtaText: "Or create your first listing",
      secondaryCtaUrl: `${appUrl()}/dashboard/listings/new`,
    }),
  };
}

export function inactiveWinbackTemplate(name: string): EmailContent {
  return {
    subject: "What's new on AccsMarkets since you've been away",
    html: baseLayout({
      marketing: true,
      preheaderText: "New listings and features have been added since your last visit.",
      emoji: "👋",
      tone: "info",
      heading: "We haven't seen you in a while",
      body: `<p>Hi ${name},</p>
<p>It's been a while since your last visit — the marketplace has kept moving. New listings are added regularly, and escrow protection now covers the full transaction from funding through transfer confirmation.</p>
<p style="font-size:13px;color:#78716c;">If you'd rather not get these emails, you can <a href="${marketingUnsubscribeUrl()}" style="color:#78716c;text-decoration:underline;">turn them off anytime</a> from your notification settings.</p>`,
      ctaText: "See what's new",
      ctaUrl: `${appUrl()}/listings`,
    }),
  };
}

// Recurring broadcast (src/app/api/internal/marketing-sweep, "general_promo"
// campaign) — sent to the full eligible user base (new and old alike) on a
// cooldown, not tied to any behavioral trigger. Deliberately doesn't presume
// inactivity (unlike inactiveWinbackTemplate above), since it goes to
// everyone regardless of when they last visited.
export function generalPromoTemplate(name: string): EmailContent {
  return {
    subject: "Escrow-protected trading, live listings, and more on AccsMarkets",
    html: baseLayout({
      marketing: true,
      preheaderText: "A quick look at what's on the marketplace right now.",
      emoji: "✨",
      tone: "brand",
      heading: "See what's trading right now",
      subheading: "Escrow-protected, start to finish",
      body: `<p>Hi ${name},</p>
<p>AccsMarkets keeps every deal escrow-protected — funds are only released once the transfer is confirmed on both sides, whether you're buying or selling. New listings go up regularly, and browsing is free.</p>
<p style="font-size:13px;color:#78716c;">If you'd rather not get emails like this, you can <a href="${marketingUnsubscribeUrl()}" style="color:#78716c;text-decoration:underline;">turn them off anytime</a> from your notification settings.</p>`,
      ctaText: "Browse listings",
      ctaUrl: `${appUrl()}/listings`,
      secondaryCtaText: "Or list something to sell",
      secondaryCtaUrl: `${appUrl()}/dashboard/listings/new`,
    }),
  };
}

// Second angle for the recurring general-promo rotation (src/app/api/internal/marketing-sweep) —
// alternated with generalPromoTemplate so the same subscriber doesn't see
// the identical email every cycle.
export function sellerFeesPromoTemplate(name: string): EmailContent {
  return {
    subject: "Turn your accounts into cash — list free on AccsMarkets",
    html: baseLayout({
      marketing: true,
      preheaderText: "Listing is free, and every sale is protected the same way every buy is.",
      emoji: "💼",
      tone: "brand",
      heading: "Got an account to sell?",
      subheading: "Free to list, escrow-protected to close",
      body: `<p>Hi ${name},</p>
<p>If you've got a social media account sitting unused, you can list it on AccsMarkets for free. Buyers fund the deal into escrow up front, so you're paid as soon as the transfer is confirmed — no chasing payment, no chargebacks.</p>
<p style="font-size:13px;color:#78716c;">If you'd rather not get emails like this, you can <a href="${marketingUnsubscribeUrl()}" style="color:#78716c;text-decoration:underline;">turn them off anytime</a> from your notification settings.</p>`,
      ctaText: "List an account",
      ctaUrl: `${appUrl()}/dashboard/listings/new`,
      secondaryCtaText: "See current fees",
      secondaryCtaUrl: `${appUrl()}/fees`,
    }),
  };
}

export function offerAbandonedTemplate(name: string, listingTitle: string, offerId: string): EmailContent {
  return {
    subject: "Your accepted offer is still waiting",
    html: baseLayout({
      marketing: true,
      preheaderText: `Your offer on "${listingTitle}" was accepted — fund the escrow to continue.`,
      emoji: "⏳",
      tone: "warning",
      heading: "Your offer was accepted",
      subheading: listingTitle,
      body: `<p>Hi ${name},</p>
<p>The seller accepted your offer on <strong>${listingTitle}</strong>, but the escrow hasn't been funded yet. Nothing has been charged — the deal just hasn't been completed.</p>
<p>If you're still interested, you can pick up right where you left off. If your plans changed, no action is needed — the offer will expire on its own.</p>`,
      ctaText: "Complete the purchase",
      // There is no /dashboard/offers/[id] page — the per-offer URL this used to
      // build was a 404. The offers list is where the accepted offer is funded.
      ctaUrl: `${appUrl()}/dashboard/offers?offer=${encodeURIComponent(offerId)}`,
    }),
  };
}

// ─── Support tickets ──────────────────────────────────────────────────────────

function escapeEmailText(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function supportTicketCreatedTemplate(name: string, ticketNumber: number, subject: string, ticketId: string): EmailContent {
  const safeSubject = escapeEmailText(subject);
  return {
    subject: `[Ticket #${ticketNumber}] We received your request — AccsMarkets`,
    html: baseLayout({
      preheaderText: `Ticket #${ticketNumber} is open. Our team will reply within 24–48 hours.`,
      emoji: "🎫",
      tone: "info",
      heading: `Ticket #${ticketNumber} opened`,
      subheading: "We're on it.",
      body: `<p>Hi ${name},</p>
<p>Thanks for contacting AccsMarkets support. We've opened a ticket for <strong>"${safeSubject}"</strong> and our team will reply within <strong>24–48 hours</strong>.</p>
<p>You can follow the conversation, add details, or attach screenshots at any time from your support centre. Replies are sent there — not by email — so please keep the ticket page handy.</p>`,
      details: [
        ["Ticket number", `#${ticketNumber}`],
        ["Subject", safeSubject],
        ["Status", "Open"],
      ],
      ctaText: "View ticket",
      ctaUrl: `${appUrl()}/dashboard/support/${encodeURIComponent(ticketId)}`,
    }),
  };
}

export function supportTicketReplyTemplate(name: string, ticketNumber: number, subject: string, replyBody: string, ticketId: string): EmailContent {
  const safeSubject = escapeEmailText(subject);
  const escaped = escapeEmailText(replyBody).replace(/\n/g, "<br/>");
  return {
    subject: `[Ticket #${ticketNumber}] Re: ${subject}`,
    html: baseLayout({
      preheaderText: replyBody.substring(0, 100),
      emoji: "💬",
      tone: "info",
      heading: "Support replied to your ticket",
      subheading: `Ticket #${ticketNumber} · ${safeSubject}`,
      body: `<p>Hi ${name},</p>
<div class="panel" style="margin:12px 0 0;padding:14px 18px;background:#fafaf9;border:1px solid #e7e5e4;border-radius:12px;">${escaped}</div>
<p style="margin-top:16px;font-size:13px;color:#6b7280;">— AccsMarkets Support Team</p>
<p>To continue the conversation, reply from the ticket page below. Replies to this email are not monitored.</p>`,
      ctaText: "Reply to ticket",
      ctaUrl: `${appUrl()}/dashboard/support/${encodeURIComponent(ticketId)}`,
    }),
  };
}
