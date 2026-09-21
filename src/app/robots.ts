import { MetadataRoute } from "next";

const BASE_URL = process.env.NEXTAUTH_URL ?? "https://accsmarkets.org";

const ALLOW = ["/", "/listings/", "/seller/", "/sellers", "/blog/", "/buy/", "/status", "/sitemap", "/help", "/docs"];
const DISALLOW = [
  "/dashboard/", "/admin/", "/api/", "/checkout/", "/onboarding",
  "/login", "/register", "/forgot-password", "/reset-password", "/verify-email", "/maintenance",
];

// AI assistant / answer-engine crawlers. Explicitly allowed so the marketplace
// can surface in Gemini, ChatGPT, Copilot, Perplexity and Apple Intelligence
// answers. (These only see the site if Cloudflare's edge AI-bot blocking is
// also turned off — check Security → Bots in the Cloudflare dashboard.)
const AI_BOTS = [
  "Google-Extended",   // Gemini / Google AI Overviews training + grounding
  "GPTBot",            // OpenAI crawler (ChatGPT)
  "OAI-SearchBot",     // ChatGPT search index
  "ChatGPT-User",      // ChatGPT live browsing
  "PerplexityBot",     // Perplexity
  "ClaudeBot",         // Anthropic / Claude
  "Claude-Web",
  "Applebot-Extended", // Apple Intelligence
  "Bingbot",           // Bing (also powers Copilot & ChatGPT search)
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // Explicit Googlebot group: Google always matches the most specific
      // user-agent group over "*", so this makes Search crawling bypass any
      // "*" groups entirely — including ones Cloudflare auto-injects at the
      // edge (its "Managed content" bot-blocking block), which otherwise sit
      // above ours and risk Google mis-parsing our own wildcard rules.
      { userAgent: "Googlebot", allow: ALLOW, disallow: DISALLOW },
      // Named AI crawlers — each gets its own explicit group so it matches
      // these rules over any "*" group (same specificity logic as Googlebot).
      { userAgent: AI_BOTS, allow: ALLOW, disallow: DISALLOW },
      { userAgent: "*", allow: ALLOW, disallow: DISALLOW },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
