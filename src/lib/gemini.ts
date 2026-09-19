const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = "gemini-2.0-flash";

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
  }>;
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
}

export interface GeminiResult {
  text: string;
  tokensIn: number;
  tokensOut: number;
}

export async function generateWithGemini(prompt: string): Promise<GeminiResult> {
  if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured.");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`Gemini API error ${res.status}: ${err.slice(0, 200)}`);
  }

  const data: GeminiResponse = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  const tokensIn  = data.usageMetadata?.promptTokenCount     ?? 0;
  const tokensOut = data.usageMetadata?.candidatesTokenCount ?? 0;

  return { text, tokensIn, tokensOut };
}
