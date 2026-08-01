import OpenAI from "openai";

/**
 * LLM client. Prefers Gemini (via Google's OpenAI-compatible endpoint)
 * when GEMINI_API_KEY is set; falls back to OpenAI.
 */

let client: OpenAI | null = null;
let model = "gpt-4o-mini";

function isReal(key: string | undefined): key is string {
  return Boolean(key && !key.includes("replace-me"));
}

export function openai(): OpenAI {
  if (!client) {
    const gemini = process.env.GEMINI_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (isReal(gemini)) {
      client = new OpenAI({
        apiKey: gemini,
        baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
      });
      model = "gemini-2.5-flash";
    } else if (isReal(openaiKey)) {
      client = new OpenAI({ apiKey: openaiKey });
      model = "gpt-4o-mini";
    } else {
      throw new Error("Neither GEMINI_API_KEY nor OPENAI_API_KEY is configured");
    }
  }
  return client;
}

export async function complete(opts: {
  system: string;
  user: string;
  maxTokens?: number;
}): Promise<string> {
  const res = await openai().chat.completions.create({
    model,
    max_tokens: opts.maxTokens ?? 300,
    // Gemini 2.5 spends "thinking" tokens from the same budget; disable so
    // small answer caps don't come back empty. Ignored by OpenAI models.
    ...(model.startsWith("gemini") ? { reasoning_effort: "none" as const } : {}),
    messages: [
      { role: "system", content: opts.system },
      { role: "user", content: opts.user },
    ],
  });
  return res.choices[0]?.message?.content?.trim() ?? "";
}
