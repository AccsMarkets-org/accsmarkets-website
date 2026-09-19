export interface ModerationResult {
  score: number;
  flags: string[];
  blocked: boolean;
}

const SCAM_PATTERNS: RegExp[] = [
  /pay\s*(me\s*)?outside/i,
  /bypass\s*(the\s*)?escrow/i,
  /send\s*(crypto|payment|money)\s*direct/i,
  /western\s*union/i,
  /gift\s*card/i,
  /wire\s*transfer\s*only/i,
  /t\.me\/[a-z0-9_]+/i,
  /@[a-z0-9_]{4,}\s*(on\s*)?telegram/i,
  /whatsapp\s*me/i,
];

const SPAM_PATTERNS: RegExp[] = [
  /(.)\1{6,}/, // same character repeated 7+ times
  /(buy now|act fast|limited time){2,}/i,
  /!{4,}/,
];

const PROFANITY_PATTERNS: RegExp[] = [
  /\bfuck\w*\b/i,
  /\bshit\w*\b/i,
  /\bbitch\w*\b/i,
  /\bcunt\w*\b/i,
];

const LINK_PATTERN = /https?:\/\/[^\s]+/gi;

// Plain-text URLs without a scheme (e.g. "google.com", "t.me/xyz")
const PLAIN_URL_PATTERN = /(?<!\w)([\w-]+\.(?:com|org|net|io|co|me|gg|tv|app|xyz|info|shop|ly|link|cc|to|ru|cn|uk|de|fr|es|br|in|pk))(?=[/\s?#]|$)/gi;

export function scoreContent(text: string, context: "listing" | "message"): ModerationResult {
  const flags: string[] = [];
  let score = 0;

  for (const pattern of SCAM_PATTERNS) {
    if (pattern.test(text)) {
      score += 40;
      flags.push("scam_pattern");
      break; // one hit is already enough to flag heavily; don't stack duplicates
    }
  }

  for (const pattern of SPAM_PATTERNS) {
    if (pattern.test(text)) {
      score += 20;
      flags.push("spam_pattern");
      break;
    }
  }

  for (const pattern of PROFANITY_PATTERNS) {
    if (pattern.test(text)) {
      score += 15;
      flags.push("profanity");
      break;
    }
  }

  // Links are flagged in messages (caller decides whether to strip or block)
  if (context === "message") {
    if (LINK_PATTERN.test(text) || PLAIN_URL_PATTERN.test(text)) {
      score += 40;
      flags.push("external_link");
    }
  } else {
    // In listings, links just add a flag but don't block
    const linkMatches = text.match(LINK_PATTERN);
    if (linkMatches && linkMatches.length > 0) {
      score += 10;
      flags.push("external_link");
    }
  }

  return { score, flags, blocked: score >= 40 };
}

export class ModerationBlockedError extends Error {
  constructor(public result: ModerationResult) {
    super("Content blocked by auto-moderation");
    this.name = "ModerationBlockedError";
  }
}

export function moderateOrThrow(text: string, context: "listing" | "message"): ModerationResult {
  const result = scoreContent(text, context);
  if (result.blocked) throw new ModerationBlockedError(result);
  return result;
}
