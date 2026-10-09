import { adviseInput, advisePrompt } from "@/er/prompts";
import type { AdviseRequest } from "@/er/types";
import { aiConfig, generateJSON } from "@/lib/ai";

export const maxDuration = 60;

export async function POST(req: Request) {
  const body = (await req.json()) as AdviseRequest;
  const started = Date.now();

  if (!body?.kpis || !Array.isArray(body.actions)) {
    return Response.json({ error: "Send kpis and actions" }, { status: 400 });
  }

  const templateResponse = (error: string) =>
    Response.json({
      message: body.actions.length
        ? body.actions.map((a) => `${a.title}: ${a.detail}`).join("\n")
        : "No problems right now. Keep the current plan.",
      meta: { mode: "rules", ms: Date.now() - started, error },
    });

  if (!aiConfig().ready) return templateResponse("No API key, so a template message was used");

  try {
    const result = await generateJSON<{ message?: unknown }>({
      system: advisePrompt(body.language === "ur" ? "ur" : "en"),
      prompt: adviseInput(body),
    });

    return Response.json({
      message: String(result.data.message ?? "").trim(),
      meta: { mode: "ai", ms: result.ms, model: result.model, cached: result.cached },
    });
  } catch (e) {
    return templateResponse(`AI failed (${(e as Error).message}), so a template message was used`);
  }
}
