export interface HelpArticle {
  slug: string;
  category: string;
  question: string;
  answer: string;
}

export const HELP_CATEGORIES = [
  "Getting Started",
  "Buying",
  "Selling",
  "Escrow & Transfers",
  "Payments & Fees",
  "Trust & Disputes",
  "Account & Security",
] as const;

export const HELP_ARTICLES: HelpArticle[] = [
  // Getting Started
  {
    slug: "what-is-accsmarkets",
    category: "Getting Started",
    question: "What is AccsMarkets?",
    answer: "AccsMarkets is a peer-to-peer marketplace for buying and selling social media accounts — YouTube channels, Instagram accounts, TikTok accounts, Facebook pages, Telegram channels, X accounts, and more. Every transaction is protected by escrow, so funds are only released once the buyer confirms the account matches the listing.",
  },
  {
    slug: "how-do-i-pay",
    category: "Getting Started",
    question: "Can I pay without depositing first?",
    answer: "Escrows are funded from your wallet balance, so you deposit first — either via crypto (TRON, BNB Chain, Ethereum, Polygon, Solana) or manual bank wire transfer. Depositing first is what makes cancellations and refunds instant, since the funds are already on the platform.",
  },
  {
    slug: "do-you-support-cards",
    category: "Getting Started",
    question: "Do you support PayPal or credit cards?",
    answer: "Not currently. Crypto rails keep funding fast, global, and chargeback-free, which is what makes instant refunds possible when an escrow is cancelled before the seller submits credentials. Bank wire transfer is also available for deposits.",
  },
  // Buying
  {
    slug: "how-buying-works",
    category: "Buying",
    question: "How do I buy an account?",
    answer: "Browse listings, open one you're interested in, and fund an escrow for the sale price plus the escrow fee. The seller then submits the account credentials through the encrypted escrow channel. You log in, verify everything matches the listing, and confirm — only then does payment release to the seller.",
  },
  {
    slug: "verified-badge",
    category: "Buying",
    question: "What does the verified badge mean?",
    answer: "Blue, gold, and grey checkmarks are assigned by the platform team to notable, business, and official accounts respectively — similar to Twitter's verification system. It's a signal of platform-reviewed legitimacy, not a guarantee of listing quality on its own.",
  },
  {
    slug: "trust-score",
    category: "Buying",
    question: "What's a trust score?",
    answer: "A 0–100 reputation score shown on every profile and listing. Both buyer and seller earn +5 points for every completed escrow. Score tiers — Rising, Trusted, Elite, Legend — reflect a track record of successful transactions.",
  },
  {
    slug: "seller-stops-responding",
    category: "Buying",
    question: "What if the seller stops responding after I pay?",
    answer: "If the seller never submits credentials, cancel the escrow for a full refund — no waiting period. If they submitted credentials but the handover stalls or something doesn't match, open a dispute and our team reviews the evidence.",
  },
  {
    slug: "wanted-posts",
    category: "Buying",
    question: "I can't find what I'm looking for — what now?",
    answer: "Post a Wanted request describing the account you need (platform, niche, follower range, budget). Sellers can respond directly, and it appears in the Wanted tab on the Browse page.",
  },
  // Selling
  {
    slug: "how-many-listings",
    category: "Selling",
    question: "How many accounts can I list?",
    answer: "Listing limits and escrow fee rates vary by subscription plan — higher plans allow more active listings and lower the escrow fee buyers pay on your listings, making them more competitive. See the current plans and pricing on the Pricing page.",
  },
  {
    slug: "how-selling-works",
    category: "Selling",
    question: "How do I sell an account?",
    answer: "Create a listing with screenshots, analytics, and pricing. Once a buyer funds an escrow, submit the account credentials and transfer details through the encrypted escrow channel — never share them in direct messages. After the buyer verifies access, the transfer window starts, and once confirmed, the full sale price is credited to your wallet instantly.",
  },
  {
    slug: "never-share-credentials-dm",
    category: "Selling",
    question: "Why shouldn't I share credentials outside of escrow?",
    answer: "Credentials submitted through the escrow channel are encrypted at rest and only released to the buyer after payment is locked in. Sharing credentials in messages or off-platform removes that protection entirely — if the buyer disappears, you have no recourse.",
  },
  // Escrow & Transfers
  {
    slug: "escrow-stages",
    category: "Escrow & Transfers",
    question: "What are the stages of an escrow?",
    answer: "Five stages: FUNDED (buyer pays into escrow), SUBMITTED (seller shares credentials through the encrypted channel), VERIFIED (buyer confirms access matches the listing), IN TRANSFER (emails, recovery methods, and 2FA move to the buyer — for YouTube, channel ownership transfers to the buyer's Gmail), and COMPLETED (buyer confirms the transfer, funds release to the seller).",
  },
  {
    slug: "transfer-timer",
    category: "Escrow & Transfers",
    question: "How does the transfer countdown work?",
    answer: "The countdown does not start when you place an order — it starts once the buyer (or an admin) verifies the account details. From that point, the seller has a set window to complete the ownership transfer. Admins can adjust the exact duration for an order when reviewing the verification step.",
  },
  {
    slug: "cancel-escrow",
    category: "Escrow & Transfers",
    question: "Can I cancel an escrow?",
    answer: "While an escrow is still FUNDED — meaning the seller hasn't submitted credentials yet — the buyer can cancel at any time for a full, immediate refund of the sale price and the escrow fee.",
  },
  {
    slug: "money-safe-in-escrow",
    category: "Escrow & Transfers",
    question: "Is my money safe while an escrow is open?",
    answer: "Yes. Funds are debited from your wallet into the platform's escrow ledger and can only move two ways: to the seller when you confirm completion, or back to you on cancellation or a buyer-favorable dispute ruling. Neither party can release funds unilaterally.",
  },
  // Payments & Fees
  {
    slug: "escrow-fee-explained",
    category: "Payments & Fees",
    question: "How does the escrow fee work?",
    answer: "The buyer pays the sale price plus an escrow fee. The fee rate depends on the seller's subscription plan — better seller plans mean a lower fee for the buyer. The seller always receives the full sale price; the platform's cut comes entirely from the buyer-side fee.",
  },
  {
    slug: "withdrawal-times",
    category: "Payments & Fees",
    question: "How long do withdrawals take?",
    answer: "Withdrawals have a $20 minimum and are reviewed manually, typically processing within 1–24 hours. There's no platform fee on withdrawals or crypto deposits (standard network fees still apply for on-chain transfers).",
  },
  {
    slug: "subscription-refunds",
    category: "Payments & Fees",
    question: "Are subscription payments refundable?",
    answer: "Subscription payments cover the current billing month and are non-refundable once activated. Cancelling stops future renewals but your plan benefits remain active until the period ends. If you were charged due to a platform error, contact support for a full refund.",
  },
  // Trust & Disputes
  {
    slug: "dispute-outcomes",
    category: "Trust & Disputes",
    question: "What happens when I open a dispute?",
    answer: "Both sides submit evidence — screenshots, recordings, messages — and our team reviews the full escrow trail before ruling. Outcomes are a full buyer refund, a seller payout, or in rare cases a negotiated partial resolution. Most disputes are resolved within a few business days, and rulings are final within the platform.",
  },
  {
    slug: "content-moderation",
    category: "Trust & Disputes",
    question: "Are listings reviewed before going live?",
    answer: "Every listing is automatically scanned for prohibited content before it appears in Browse. Sellers also verify ownership of the account before it's approved for listing.",
  },
  {
    slug: "kyc-verification",
    category: "Trust & Disputes",
    question: "What is KYC verification and do I need it?",
    answer: "Sellers can complete phone and ID verification to build buyer confidence — it uses liveness detection and document authentication, and shows as a verified badge on your profile. Buyers can purchase without any verification; verification is only required to list and sell on a seller account.",
  },
  // Account & Security
  {
    slug: "two-factor-auth",
    category: "Account & Security",
    question: "How do I enable two-factor authentication?",
    answer: "Enable 2FA from your security settings to protect your account with a time-based one-time password (TOTP) via an authenticator app. All admin accounts are required to have 2FA enabled.",
  },
  {
    slug: "encrypted-credentials",
    category: "Account & Security",
    question: "How are account credentials protected during a transfer?",
    answer: "Credentials shared during a transfer are encrypted at rest using AES-256 and are only accessible to the intended recipient and the escrow system — never exposed in plain text, even to platform staff outside the transfer flow.",
  },
  {
    slug: "session-management",
    category: "Account & Security",
    question: "How do I manage my active sessions?",
    answer: "Your security settings show all active sessions and let you revoke any of them individually. Sessions also expire automatically after 30 days of inactivity.",
  },
  {
    slug: "report-security-issue",
    category: "Account & Security",
    question: "How do I report a security issue?",
    answer: "Email security@accsmarkets.org with details. We investigate all reports promptly and credit researchers who help us improve the platform.",
  },
];

export function searchHelpArticles(query: string): HelpArticle[] {
  const q = query.trim().toLowerCase();
  if (!q) return HELP_ARTICLES;
  return HELP_ARTICLES.filter(
    (a) => a.question.toLowerCase().includes(q) || a.answer.toLowerCase().includes(q) || a.category.toLowerCase().includes(q)
  );
}
