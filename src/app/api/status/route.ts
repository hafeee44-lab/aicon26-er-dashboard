import { aiConfig, generateJSON } from "@/lib/ai";

export async function GET(req: Request) {
  const cfg = aiConfig();
  const status = {
    provider: cfg.provider,
    model: cfg.model,
    fallbackModel: cfg.fallbackModel || null,
    ready: cfg.ready,
  };

  if (!new URL(req.url).searchParams.has("ping") || !cfg.ready) {
    return Response.json(status);
  }

  try {
    const result = await generateJSON<{ ok: boolean }>(
      { system: "Return JSON only.", prompt: 'Reply with exactly {"ok": true}' },
      { cache: false },
    );
    return Response.json({ ...status, ping: "ok", ms: result.ms, answeredBy: result.model });
  } catch (e) {
    return Response.json({ ...status, ping: "failed", error: (e as Error).message }, { status: 502 });
  }
}
