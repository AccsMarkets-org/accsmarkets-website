// AI provider abstraction - supports Groq (free), Grok (xAI), OpenAI, and Gemini
// Env vars are read at call time so PM2 reloads always pick up changes.

export interface AIResult {
  text: string;
  tokensIn: number;
  tokensOut: number;
  provider: "groq" | "grok" | "gemini" | "openai";
}

export interface AIOptions {
  /** Force JSON output — provider uses its native JSON mode */
  jsonMode?: boolean;
  /** Override max output tokens (default 4096) */
  maxTokens?: number;
  /** System message override */
  systemPrompt?: string;
}

const DEFAULT_SYSTEM = "You are a professional content writer for AccsMarkets, a marketplace for buying and selling social media accounts.";
const DEFAULT_SYSTEM_JSON = "You are a professional content writer for AccsMarkets. You always respond with valid JSON.";

// ── OpenAI-compatible helper (used by Groq, Grok, and OpenAI) ─────────────────
interface OAIResponse {
  choices?: Array<{ message?: { content?: string } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
  error?: { message?: string };
}

async function callOpenAICompat(
  url: string,
  apiKey: string,
  model: string,
  prompt: string,
  opts: AIOptions,
  provider: "groq" | "grok" | "openai"
): Promise<AIResult> {
  const systemMsg = opts.systemPrompt ?? (opts.jsonMode ? DEFAULT_SYSTEM_JSON : DEFAULT_SYSTEM);

  const body: Record<string, unknown> = {
    model,
    messages: [
      { role: "system", content: systemMsg },
      { role: "user",   content: prompt },
    ],
    temperature: 0.7,
    max_tokens: opts.maxTokens ?? 4096,
  };
  if (opts.jsonMode) body.response_format = { type: "json_object" };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120_000),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`${provider} API error ${res.status}: ${err.slice(0, 300)}`);
  }

  const data: OAIResponse = await res.json();
  if (data.error?.message) throw new Error(`${provider}: ${data.error.message}`);
  const text = data.choices?.[0]?.message?.content ?? "";
  if (!text) throw new Error(`${provider} returned empty response`);

  return {
    text,
    tokensIn:  data.usage?.prompt_tokens    ?? 0,
    tokensOut: data.usage?.completion_tokens ?? 0,
    provider,
  };
}

// ── Individual provider functions ─────────────────────────────────────────────

async function withGroq(prompt: string, opts: AIOptions): Promise<AIResult> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY not configured");
  // llama-3.3-70b-versatile was decommissioned by Groq; openai/gpt-oss-120b
  // confirmed available via a live GET /openai/v1/models call against this
  // account's key (2026-09-16).
  const model = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
  return callOpenAICompat("https://api.groq.com/openai/v1/chat/completions", key, model, prompt, opts, "groq");
}

async function withGrok(prompt: string, opts: AIOptions): Promise<AIResult> {
  const key = process.env.XAI_API_KEY;
  if (!key) throw new Error("XAI_API_KEY not configured");
  const model = process.env.XAI_MODEL || "grok-3-mini";
  return callOpenAICompat("https://api.x.ai/v1/chat/completions", key, model, prompt, opts, "grok");
}

async function withOpenAI(prompt: string, opts: AIOptions): Promise<AIResult> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY not configured");
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  return callOpenAICompat("https://api.openai.com/v1/chat/completions", key, model, prompt, opts, "openai");
}

async function withGemini(prompt: string, opts: AIOptions): Promise<AIResult> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY not configured");
  // gemini-2.0-flash was retired; gemini-3.6-flash confirmed available via a
  // live GET /v1beta/models call against this account's key (2026-09-16).
  const model = process.env.GEMINI_MODEL || "gemini-3.6-flash";

  interface GeminiResponse {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
    error?: { message?: string };
  }

  // Gemini's REST API has no separate system-message slot in this request shape —
  // fold it into the prompt text so a systemPrompt override (e.g. blog generation's
  // voice/quality rules) isn't silently dropped when Gemini serves as a fallback.
  const fullText = opts.systemPrompt ? `${opts.systemPrompt}\n\n${prompt}` : prompt;

  const bodyObj: Record<string, unknown> = {
    contents: [{ parts: [{ text: fullText }] }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: opts.maxTokens ?? 4096,
      ...(opts.jsonMode ? { responseMimeType: "application/json" } : {}),
    },
  };

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(bodyObj), signal: AbortSignal.timeout(120_000) }
  );

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`Gemini API error ${res.status}: ${err.slice(0, 300)}`);
  }

  const data: GeminiResponse = await res.json();
  if (data.error?.message) throw new Error(`Gemini: ${data.error.message}`);
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  if (!text) throw new Error("Gemini returned empty response");

  return {
    text,
    tokensIn:  data.usageMetadata?.promptTokenCount    ?? 0,
    tokensOut: data.usageMetadata?.candidatesTokenCount ?? 0,
    provider: "gemini",
  };
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Generate text with the configured AI provider.
 * Falls back to other providers if the primary fails.
 */
export async function generateWithAI(prompt: string, opts: AIOptions = {}): Promise<AIResult> {
  const provider  = process.env.AI_PROVIDER || "auto";
  const groqKey   = process.env.GROQ_API_KEY;
  const grokKey   = process.env.XAI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  // Explicit provider — try it, then fall through to auto-fallback on error
  const errors: string[] = [];

  async function tryProvider(name: string, fn: () => Promise<AIResult>): Promise<AIResult | null> {
    try { return await fn(); }
    catch (e) {
      errors.push(`${name}: ${e instanceof Error ? e.message : String(e)}`);
      return null;
    }
  }

  // Build ordered list of providers to try
  type ProviderEntry = [string, () => Promise<AIResult> | null];
  const order: ProviderEntry[] = [];

  if (provider === "groq")   order.push(["groq",   groqKey   ? () => withGroq(prompt, opts)   : null as unknown as () => Promise<AIResult>]);
  if (provider === "grok")   order.push(["grok",   grokKey   ? () => withGrok(prompt, opts)   : null as unknown as () => Promise<AIResult>]);
  if (provider === "openai") order.push(["openai", openaiKey ? () => withOpenAI(prompt, opts) : null as unknown as () => Promise<AIResult>]);
  if (provider === "gemini") order.push(["gemini", geminiKey ? () => withGemini(prompt, opts) : null as unknown as () => Promise<AIResult>]);

  // Always append all providers as fallback (skipping already-added primary)
  const fallbacks: ProviderEntry[] = [
    ["groq",   groqKey   ? () => withGroq(prompt, opts)   : null as unknown as () => Promise<AIResult>],
    ["grok",   grokKey   ? () => withGrok(prompt, opts)   : null as unknown as () => Promise<AIResult>],
    ["openai", openaiKey ? () => withOpenAI(prompt, opts) : null as unknown as () => Promise<AIResult>],
    ["gemini", geminiKey ? () => withGemini(prompt, opts) : null as unknown as () => Promise<AIResult>],
  ];
  for (const fb of fallbacks) {
    if (!order.find(([n]) => n === fb[0])) order.push(fb);
  }

  for (const [name, fn] of order) {
    if (!fn) continue;
    const result = await tryProvider(name, fn);
    if (result) return result;
  }

  throw new Error(
    `All AI providers failed. Configure GROQ_API_KEY, XAI_API_KEY, OPENAI_API_KEY, or GEMINI_API_KEY.\nErrors: ${errors.join(" | ")}`
  );
}

// ── Availability check ────────────────────────────────────────────────────────

export function getAvailableProviders() {
  const groq   = !!process.env.GROQ_API_KEY;
  const grok   = !!process.env.XAI_API_KEY;
  const openai = !!process.env.OPENAI_API_KEY;
  const gemini = !!process.env.GEMINI_API_KEY;
  const provider = process.env.AI_PROVIDER || "auto";
  const current =
    provider !== "auto" ? provider :
    groq ? "groq" : grok ? "grok" : openai ? "openai" : gemini ? "gemini" : "none";
  return { groq, grok, gemini, openai, current, anyConfigured: groq || grok || openai || gemini };
}
