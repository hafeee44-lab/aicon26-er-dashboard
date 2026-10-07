import { getDomain } from "@/domains";
import { aiConfig, generateJSON } from "@/lib/ai";
import { summaryInput, summaryPrompt } from "@/lib/prompts";
import type { Summary, SummarizeRequest } from "@/lib/types";

export const maxDuration = 60;

function template(req: SummarizeRequest): Summary {
  const [first, ...rest] = req.metrics;

  return {
    headline: first ? `${first.label}: ${first.value}` : "Analysis complete",
    summary: rest.map((m) => `${m.label}: ${m.value}.`).join(" "),
    actions: req.top.slice(0, 3).map((t) => `${t.name}: ${t.action}`),
  };
}

export async function POST(req: Request) {
  const body = (await req.json()) as SummarizeRequest;
  const domain = getDomain(body.domainId);
  const started = Date.now();

  if (!domain || !Array.isArray(body.metrics) || !Array.isArray(body.top)) {
    return Response.json({ error: "Send a domainId, metrics and top" }, { status: 400 });
  }

  const templateResponse = (error: string) =>
    Response.json({ summary: template(body), meta: { mode: "rules", ms: Date.now() - started, error } });

  if (!aiConfig().ready) return templateResponse("No API key, so a template summary was used");

  try {
    const result = await generateJSON<Partial<Summary>>({
      system: summaryPrompt(domain, body.language === "ur" ? "ur" : "en"),
      prompt: summaryInput(body),
    });

    const summary: Summary = {
      headline: String(result.data.headline ?? ""),
      summary: String(result.data.summary ?? ""),
      actions: Array.isArray(result.data.actions) ? result.data.actions.map(String).slice(0, 5) : [],
    };

    return Response.json({
      summary,
      meta: { mode: "ai", ms: result.ms, model: result.model, cached: result.cached },
    });
  } catch (e) {
    return templateResponse(`AI failed (${(e as Error).message}), so a template summary was used`);
  }
}
