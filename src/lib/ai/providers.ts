import type { Attachment } from "@/lib/types";
import type { AIConfig } from "./config";

export type { Attachment };

export type AIRequest = {
  system: string;
  prompt: string;
  files?: Attachment[];
};

export class AIError extends Error {
  constructor(
    message: string,
    public status = 500,
  ) {
    super(message);
  }
}

async function post(url: string, headers: Record<string, string>, body: unknown, timeoutMs: number) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(Math.max(1, Math.round(timeoutMs))),
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message = json?.error?.message || `${res.status} ${res.statusText}`;
    throw new AIError(message, res.status);
  }

  return json;
}

async function gemini(cfg: AIConfig, model: string, req: AIRequest, timeoutMs: number) {
  const files = (req.files ?? []).map((f) => ({
    inlineData: { mimeType: f.mimeType, data: f.data },
  }));

  const json = await post(
    `${cfg.baseUrl}/models/${model}:generateContent`,
    { "x-goog-api-key": cfg.key },
    {
      systemInstruction: { parts: [{ text: req.system }] },
      contents: [{ role: "user", parts: [...files, { text: req.prompt }] }],
      generationConfig: { responseMimeType: "application/json" },
    },
    timeoutMs,
  );

  const parts: { text?: string }[] = json.candidates?.[0]?.content?.parts ?? [];
  return parts.map((p) => p.text ?? "").join("");
}

async function openaiCompatible(cfg: AIConfig, model: string, req: AIRequest, timeoutMs: number) {
  const content = req.files?.length
    ? [
        { type: "text", text: req.prompt },
        ...req.files.map((f) => ({
          type: "image_url",
          image_url: { url: `data:${f.mimeType};base64,${f.data}` },
        })),
      ]
    : req.prompt;

  const json = await post(
    `${cfg.baseUrl}/chat/completions`,
    { authorization: `Bearer ${cfg.key}` },
    {
      model,
      messages: [
        { role: "system", content: req.system },
        { role: "user", content },
      ],
      response_format: { type: "json_object" },
    },
    timeoutMs,
  );

  return json.choices?.[0]?.message?.content ?? "";
}

async function anthropic(cfg: AIConfig, model: string, req: AIRequest, timeoutMs: number) {
  const files = (req.files ?? []).map((f) => ({
    type: f.mimeType === "application/pdf" ? "document" : "image",
    source: { type: "base64", media_type: f.mimeType, data: f.data },
  }));

  const json = await post(
    `${cfg.baseUrl}/messages`,
    { "x-api-key": cfg.key, "anthropic-version": "2023-06-01" },
    {
      model,
      max_tokens: 8000,
      system: req.system,
      messages: [{ role: "user", content: [...files, { type: "text", text: req.prompt }] }],
    },
    timeoutMs,
  );

  const blocks: { type: string; text?: string }[] = json.content ?? [];
  return blocks
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");
}

export function callProvider(cfg: AIConfig, model: string, req: AIRequest, timeoutMs = 90_000) {
  if (cfg.provider === "gemini") return gemini(cfg, model, req, timeoutMs);
  if (cfg.provider === "anthropic") return anthropic(cfg, model, req, timeoutMs);
  return openaiCompatible(cfg, model, req, timeoutMs);
}
