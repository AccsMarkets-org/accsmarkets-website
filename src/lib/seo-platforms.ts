import type { Platform } from "@prisma/client";

/**
 * SEO content for the /buy/[slug] platform landing pages.
 * Each page targets the "buy <platform> account/channel" keyword cluster
 * with unique copy, FAQs, and live listings.
 */

export interface PlatformSeoContent {
  slug: string;
  platform: Platform;
  name: string;
  /** What a unit is called on this platform: channel, account, page… */
  unit: string;
  unitPlural: string;
  title: string;
  metaDescription: string;
  h1: string;
  intro: string[];
  whyBuy: { title: string; text: string }[];
  faqs: { q: string; a: string }[];
}

export const PLATFORM_SEO: PlatformSeoContent[] = [
  {
    slug: "youtube-channels",
    platform: "YOUTUBE",
    name: "YouTube",
    unit: "channel",
    unitPlural: "channels",
    title: "Buy YouTube Channels — Monetized & Verified | AccsMarkets",
    metaDescription:
      "Buy established YouTube channels with real subscribers, watch history and monetization enabled. Every purchase is protected by escrow. Browse verified YouTube channels for sale.",
    h1: "Buy YouTube Channels",
    intro: [
      "Skip the years of grinding toward 1,000 subscribers and 4,000 watch hours. AccsMarkets lets you buy an established YouTube channel with an existing audience, upload history, and — in many cases — monetization already enabled through the YouTube Partner Program.",
      "Every channel listed on our marketplace goes through admin review before it appears here. Sellers verify ownership of their channel before listing, and your payment sits in escrow until the channel is fully transferred to you and you've confirmed everything checks out. If anything doesn't match the listing, you get your money back.",
      "Browse monetized YouTube channels, niche channels with loyal subscribers, and aged channels with strong watch-time history. Filter by subscriber count, price, and monetization status to find the right channel for your content plans.",
    ],
    whyBuy: [
      { title: "Monetization from day one", text: "Many channels for sale already have the YouTube Partner Program enabled — start earning ad revenue immediately instead of waiting months to qualify." },
      { title: "Established audience", text: "Buying a channel with real, engaged subscribers gives your content instant reach that would take years to build organically." },
      { title: "Aged channel authority", text: "Older channels with consistent upload history tend to perform better in YouTube's recommendation algorithm than brand-new ones." },
    ],
    faqs: [
      { q: "Is it safe to buy a YouTube channel?", a: "On AccsMarkets, yes. Your payment is held in escrow until the channel is transferred to your email and you confirm the subscriber count, monetization status, and analytics match the listing. If the seller misrepresents anything, you can open a dispute and get refunded." },
      { q: "Can I buy a monetized YouTube channel?", a: "Yes. Use the monetized filter to see channels with the YouTube Partner Program already active. AdSense linkage is handled during the transfer, and monetization status is verified during escrow." },
      { q: "How is the YouTube channel transferred to me?", a: "The seller transfers primary ownership of the channel to your Google account through YouTube's channel-permissions system, or hands over the Google account itself with recovery details updated to your information." },
      { q: "How much does a YouTube channel cost?", a: "Prices range from under $100 for small niche channels to tens of thousands of dollars for large monetized channels. Price depends on subscribers, watch time, niche, revenue, and monetization status." },
      { q: "Will the channel lose subscribers after I buy it?", a: "Subscribers stay with the channel through the transfer. Keeping them engaged depends on maintaining a similar content style and upload schedule after the purchase." },
    ],
  },
  {
    slug: "instagram-accounts",
    platform: "INSTAGRAM",
    name: "Instagram",
    unit: "account",
    unitPlural: "accounts",
    title: "Buy Instagram Accounts — Real Followers, Escrow-Protected | AccsMarkets",
    metaDescription:
      "Buy Instagram accounts with real, engaged followers. Aged accounts, niche pages, and verified profiles for sale — every transaction protected by escrow on AccsMarkets.",
    h1: "Buy Instagram Accounts",
    intro: [
      "Building an Instagram audience from zero is slower than it's ever been. AccsMarkets lets you buy an established Instagram account with real followers, an engaged audience, and a posting history that the algorithm already trusts.",
      "Whether you need a niche fan page, a theme page with viral reach, or an aged account for your brand, every listing here is reviewed before going live. Sellers verify account ownership, and your money is held in escrow until the account is in your hands with credentials changed and recovery details updated.",
      "Filter by follower count, price, and niche to find the right Instagram account for sale. Check each listing's engagement screenshots and analytics before you commit — and if the account isn't as described, escrow protects your refund.",
    ],
    whyBuy: [
      { title: "Instant audience reach", text: "An established account with real followers gives your content, brand, or product immediate distribution instead of months of posting into the void." },
      { title: "Algorithm trust", text: "Aged Instagram accounts with consistent activity history get better reach on Reels and Explore than fresh accounts." },
      { title: "Niche communities included", text: "Theme pages and fan pages come with a targeted audience already interested in your topic — ideal for affiliate marketing or launching a brand." },
    ],
    faqs: [
      { q: "Is buying an Instagram account safe?", a: "With escrow, yes. Your payment is only released to the seller after the account credentials, linked email, and phone number are transferred to you and you've verified the follower count and engagement match the listing." },
      { q: "How do I know the followers are real?", a: "Listings include engagement metrics and analytics screenshots. Check the like-to-follower ratio and comment quality. During escrow you can inspect the account's audience insights before releasing payment." },
      { q: "What happens to the linked email and phone?", a: "During the escrow transfer, the seller removes their phone number and transfers the linked email to you (or you replace it with your own), so you have full recovery control." },
      { q: "How much do Instagram accounts cost?", a: "Small niche accounts start under $50. Accounts with 100k+ real followers typically range from several hundred to several thousand dollars depending on niche and engagement rate." },
      { q: "Can I change the account's niche after buying?", a: "You can, but gradual transitions retain more followers. Abrupt niche changes typically cause some audience loss — factor that into which account you buy." },
    ],
  },
  {
    slug: "tiktok-accounts",
    platform: "TIKTOK",
    name: "TikTok",
    unit: "account",
    unitPlural: "accounts",
    title: "Buy TikTok Accounts — Established Audiences for Sale | AccsMarkets",
    metaDescription:
      "Buy TikTok accounts with real followers and viral history. Monetized and Creator-Fund-eligible accounts for sale, all protected by escrow on AccsMarkets.",
    h1: "Buy TikTok Accounts",
    intro: [
      "TikTok reach is gold — but building a following means beating an algorithm that buries most new creators. AccsMarkets lets you buy a TikTok account that already has followers, viral history, and momentum.",
      "Listings range from niche accounts with loyal micro-audiences to large accounts eligible for TikTok's monetization programs. Every listing is admin-reviewed, sellers verify ownership before listing, and escrow holds your payment until the account is fully yours.",
      "Compare accounts by follower count, engagement, and price. Each listing shows analytics screenshots so you can judge audience quality before buying.",
    ],
    whyBuy: [
      { title: "Skip the cold start", text: "TikTok's algorithm favors accounts with engagement history. An established account gets your content in front of viewers immediately." },
      { title: "Monetization eligibility", text: "Accounts meeting follower and view thresholds can access TikTok's Creator Rewards and live gifts — no waiting to qualify." },
      { title: "Proven niches", text: "Buy into a niche with demonstrated viral history rather than gambling on a new account finding its audience." },
    ],
    faqs: [
      { q: "Is it safe to buy a TikTok account?", a: "Yes — escrow protects every purchase on AccsMarkets. The seller only receives payment after you've received the credentials, updated the linked email and phone, and confirmed the account matches the listing." },
      { q: "How is a TikTok account transferred?", a: "The seller provides login credentials during escrow. You then change the password, swap the linked email and phone number to yours, and verify the follower count before releasing payment." },
      { q: "Do TikTok accounts keep their reach after transfer?", a: "Yes, as long as you post consistently in a similar style. Reach depends on content performance, not account ownership." },
      { q: "How much does a TikTok account cost?", a: "Prices scale with followers and engagement — small accounts start around $50, while accounts with hundreds of thousands of engaged followers can run into the thousands." },
    ],
  },
  {
    slug: "facebook-pages",
    platform: "FACEBOOK",
    name: "Facebook",
    unit: "page",
    unitPlural: "pages",
    title: "Buy Facebook Pages & Accounts — Aged, With Real Audiences | AccsMarkets",
    metaDescription:
      "Buy established Facebook pages and aged accounts with real followers. Monetized pages, niche communities and BM-ready profiles — escrow-protected on AccsMarkets.",
    h1: "Buy Facebook Pages & Accounts",
    intro: [
      "Facebook remains the largest social platform on earth, and established pages with real followings are valuable assets for marketers, publishers, and brands. AccsMarkets lists Facebook pages, groups, and aged profiles for sale — all reviewed before listing and protected by escrow.",
      "Buy a page with an engaged niche audience for organic reach, an aged profile for advertising stability, or a monetized page already earning through in-stream ads and Facebook's bonus programs.",
      "Every purchase is held in escrow until admin roles or credentials are fully transferred and you've verified the audience and monetization status match the listing.",
    ],
    whyBuy: [
      { title: "Organic reach that still works", text: "Established pages with engaged followers deliver consistent organic distribution — increasingly rare for new pages." },
      { title: "Ad account stability", text: "Aged Facebook profiles and pages have more trust with Facebook's ad systems than freshly created ones." },
      { title: "Monetization in place", text: "Some pages come with in-stream ad monetization already approved — revenue from day one." },
    ],
    faqs: [
      { q: "How is a Facebook page transferred?", a: "The seller adds you as an admin, you accept, and once your admin role is confirmed the seller removes themselves. For profile sales, credentials plus linked email are transferred during escrow." },
      { q: "Is buying a Facebook page safe?", a: "With AccsMarkets escrow, your payment isn't released until you hold full admin control and have verified followers and monetization status against the listing." },
      { q: "Can I rename a Facebook page after buying it?", a: "Yes — page names can be changed through Facebook's page settings, though large changes may require review by Facebook." },
      { q: "What's the difference between buying a page and a profile?", a: "A page is a public brand asset managed by admins; a profile is a personal account. Pages transfer cleanly via admin roles; profiles transfer via credentials. Pages are generally the safer, cleaner purchase." },
    ],
  },
  {
    slug: "telegram-channels",
    platform: "TELEGRAM",
    name: "Telegram",
    unit: "channel",
    unitPlural: "channels",
    title: "Buy Telegram Channels & Groups — Real Members | AccsMarkets",
    metaDescription:
      "Buy Telegram channels and groups with real, active members. Crypto, news, and niche communities for sale — every deal protected by escrow on AccsMarkets.",
    h1: "Buy Telegram Channels",
    intro: [
      "Telegram channels are direct lines to engaged audiences — no algorithm deciding who sees your posts. AccsMarkets lists established Telegram channels and groups with real members, from crypto and finance communities to news and entertainment niches.",
      "Unlike other platforms, every subscriber in a Telegram channel sees your content in their feed. That makes established channels exceptionally valuable for marketers, community builders, and publishers.",
      "All listings are reviewed before going live, and escrow holds your payment until ownership is transferred and member counts verify against the listing.",
    ],
    whyBuy: [
      { title: "100% reach, no algorithm", text: "Every post reaches every member's feed directly — engagement rates far beyond feed-based platforms." },
      { title: "High-intent communities", text: "Telegram audiences in niches like crypto and finance are among the most engaged and monetizable on any platform." },
      { title: "Simple ownership transfer", text: "Telegram channel ownership transfers cleanly in-app — you get full control immediately." },
    ],
    faqs: [
      { q: "How is a Telegram channel transferred?", a: "The seller transfers channel ownership to your Telegram account directly in the app. Once you're the owner, you control admins, content, and settings — then payment is released from escrow." },
      { q: "How do I verify Telegram members are real?", a: "Check the views-per-post relative to member count in the listing screenshots — real channels show consistent view ratios. During escrow you can inspect the channel analytics before releasing payment." },
      { q: "How much does a Telegram channel cost?", a: "Pricing depends on niche and member quality. Small niche channels start under $100; large active channels in monetizable niches can reach thousands of dollars." },
    ],
  },
  {
    slug: "twitter-accounts",
    platform: "TWITTER_X",
    name: "X (Twitter)",
    unit: "account",
    unitPlural: "accounts",
    title: "Buy X (Twitter) Accounts — Aged & Established | AccsMarkets",
    metaDescription:
      "Buy aged X (Twitter) accounts with real followers and history. Established profiles for brands, creators and marketers — escrow-protected on AccsMarkets.",
    h1: "Buy X (Twitter) Accounts",
    intro: [
      "An established X account with real followers and posting history carries reach and credibility that new accounts can't match. AccsMarkets lists aged X (Twitter) accounts and large-following profiles for sale, each reviewed before listing.",
      "Buy an account with an audience in your niche, an aged handle with history, or a profile eligible for X's monetization programs. Escrow protects every transaction — payment is released only after credentials, email, and phone are fully transferred to you.",
    ],
    whyBuy: [
      { title: "Aged account trust", text: "Older accounts with consistent history have more reach and fewer restrictions than newly registered ones." },
      { title: "Monetization eligibility", text: "Accounts meeting X's follower and impression thresholds can enable ad revenue sharing and subscriptions." },
      { title: "Niche audiences", text: "Buy directly into a following that matches your content or product instead of building from zero." },
    ],
    faqs: [
      { q: "Is buying an X account against the rules?", a: "Account transfers happen through credential handover during escrow. AccsMarkets verifies seller ownership before listing and holds payment until you fully control the account, including linked email and phone." },
      { q: "How much do X accounts cost?", a: "Aged accounts with small followings start under $50. Accounts with large, engaged audiences in monetizable niches range from hundreds to thousands of dollars." },
      { q: "Can I change the handle after buying?", a: "Yes, the @handle can be changed in settings at any time without losing followers." },
    ],
  },
  {
    slug: "snapchat-accounts",
    platform: "SNAPCHAT",
    name: "Snapchat",
    unit: "account",
    unitPlural: "accounts",
    title: "Buy Snapchat Accounts — Established Profiles for Sale | AccsMarkets",
    metaDescription:
      "Buy Snapchat accounts with established audiences and Spotlight history. Escrow-protected transfers on AccsMarkets.",
    h1: "Buy Snapchat Accounts",
    intro: [
      "Snapchat's audience skews young, loyal, and hard to reach anywhere else. AccsMarkets lists established Snapchat accounts with subscribers, streaks, and Spotlight history for sale.",
      "Each listing is reviewed before it goes live, and escrow holds your payment until the account credentials and recovery details are fully yours.",
    ],
    whyBuy: [
      { title: "Hard-to-reach demographic", text: "Snapchat reaches younger audiences that are increasingly absent from other platforms." },
      { title: "Spotlight momentum", text: "Accounts with Spotlight history have proven content-performance signals within Snapchat's discovery system." },
    ],
    faqs: [
      { q: "How is a Snapchat account transferred?", a: "The seller hands over login credentials during escrow; you then update the password, email, and phone number. Payment is released once you've confirmed full control." },
      { q: "How much does a Snapchat account cost?", a: "Prices depend on subscriber count and engagement, typically ranging from under $50 for small accounts to several hundred dollars for established ones." },
    ],
  },
  {
    slug: "pinterest-accounts",
    platform: "PINTEREST",
    name: "Pinterest",
    unit: "account",
    unitPlural: "accounts",
    title: "Buy Pinterest Accounts — Monthly Views & Niche Boards | AccsMarkets",
    metaDescription:
      "Buy established Pinterest accounts with high monthly views and niche boards. Great for affiliate and e-commerce traffic — escrow-protected on AccsMarkets.",
    h1: "Buy Pinterest Accounts",
    intro: [
      "Pinterest is a search engine disguised as a social platform — and established accounts with strong monthly views drive consistent, passive traffic for months per pin. AccsMarkets lists Pinterest accounts with built-out boards, follower bases, and proven impressions.",
      "Ideal for affiliate marketers, bloggers, and e-commerce stores: buy an account already ranking in your niche and plug in your own content. Escrow protects the full transfer.",
    ],
    whyBuy: [
      { title: "Evergreen traffic", text: "Pins keep driving clicks for months or years — unlike feed posts that die in hours." },
      { title: "Buyer-intent audience", text: "Pinterest users actively search and plan purchases, making the traffic unusually valuable for e-commerce and affiliate offers." },
    ],
    faqs: [
      { q: "How do monthly views translate to traffic?", a: "Monthly views measure impressions of your pins. Click-through depends on your content, but accounts with millions of monthly views consistently drive meaningful outbound traffic." },
      { q: "How is a Pinterest account transferred?", a: "Credentials plus the linked email are handed over during escrow. You verify analytics access and follower counts before payment is released." },
    ],
  },
  {
    slug: "linkedin-accounts",
    platform: "LINKEDIN",
    name: "LinkedIn",
    unit: "account",
    unitPlural: "accounts",
    title: "Buy LinkedIn Accounts & Pages — Aged, Connected Profiles | AccsMarkets",
    metaDescription:
      "Buy aged LinkedIn accounts and company pages with established connections and followers. Escrow-protected transfers on AccsMarkets.",
    h1: "Buy LinkedIn Accounts",
    intro: [
      "LinkedIn reach is driven by account age, connections, and engagement history. AccsMarkets lists aged LinkedIn profiles and company pages with established networks — valuable for B2B outreach, recruiting, and thought-leadership plays.",
      "Every listing is reviewed before appearing here, and escrow ensures you receive complete account control before the seller is paid.",
    ],
    whyBuy: [
      { title: "B2B reach", text: "Established profiles with real connections get dramatically better post reach and InMail response rates." },
      { title: "Aged-account stability", text: "Older LinkedIn accounts face fewer restrictions on connection requests and outreach volume." },
    ],
    faqs: [
      { q: "How is a LinkedIn account transferred?", a: "Login credentials and the linked email are transferred during escrow. You update recovery details and verify connections before releasing payment." },
      { q: "What should I check before buying?", a: "Account age, connection count and quality, SSI score if listed, and any posting history in your target industry." },
    ],
  },
  {
    slug: "websites",
    platform: "WEBSITE",
    name: "Website",
    unit: "website",
    unitPlural: "websites",
    title: "Buy Websites — Monetized Sites & Domains for Sale | AccsMarkets",
    metaDescription:
      "Buy established websites with traffic and revenue. Content sites, blogs, and monetized domains for sale — every deal escrow-protected on AccsMarkets.",
    h1: "Buy Websites",
    intro: [
      "Established websites with traffic and revenue are among the most reliable digital assets you can buy. AccsMarkets lists content sites, niche blogs, and monetized domains — each reviewed before listing.",
      "Escrow protects the full transfer: domain, hosting, content, and monetization accounts move to you before the seller receives payment.",
    ],
    whyBuy: [
      { title: "Immediate cash flow", text: "Monetized sites with AdSense, affiliate, or product revenue start earning for you from the day of transfer." },
      { title: "SEO equity included", text: "Aged domains with backlinks and rankings carry search authority that takes years to build from scratch." },
    ],
    faqs: [
      { q: "What's included when I buy a website?", a: "Typically the domain, site files, content, and monetization accounts where transferable. Each listing details exactly what transfers — verify during escrow before releasing payment." },
      { q: "How is a website transferred?", a: "The domain is pushed to your registrar account, site files are migrated to your hosting, and analytics or monetization accounts are handed over — all during the escrow window." },
    ],
  },
];

export function getPlatformSeoBySlug(slug: string): PlatformSeoContent | undefined {
  return PLATFORM_SEO.find((p) => p.slug === slug);
}
