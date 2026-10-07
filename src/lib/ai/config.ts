export type Provider = "gemini" | "openai" | "groq" | "anthropic";

const DEFAULT_MODEL: Record<Provider, string> = {
  gemini: "gemini-3.5-flash-lite",
  openai: "",
  groq: "",
  anthropic: "",
};

const BASE_URL: Record<Provider, string> = {
  gemini: "https://generativelanguage.googleapis.com/v1beta",
  openai: "https://api.openai.com/v1",
  groq: "https://api.groq.com/openai/v1",
  anthropic: "https://api.anthropic.com/v1",
};

export function aiConfig() {
  const provider = (process.env.AI_PROVIDER || "gemini") as Provider;

  const key = {
    gemini: process.env.GEMINI_API_KEY,
    openai: process.env.OPENAI_API_KEY,
    groq: process.env.GROQ_API_KEY,
    anthropic: process.env.ANTHROPIC_API_KEY,
  }[provider];

  const model = process.env.AI_MODEL || DEFAULT_MODEL[provider];
  const fallbackModel = process.env.AI_FALLBACK_MODEL || "";
  const baseUrl = process.env.AI_BASE_URL || BASE_URL[provider];
  const cache = process.env.AI_CACHE !== "off";
  const timeLimit = Number(process.env.AI_TIME_LIMIT);

  return {
    provider,
    key: key ?? "",
    model,
    fallbackModel,
    baseUrl,
    cache,
    timeLimitMs: (timeLimit > 0 ? timeLimit : 25) * 1000,
    ready: Boolean(key && model && BASE_URL[provider]),
  };
}

export type AIConfig = ReturnType<typeof aiConfig>;
