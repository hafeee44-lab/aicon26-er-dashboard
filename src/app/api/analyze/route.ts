import { getDomain, type Row } from "@/domains";
import { aiConfig, generateJSON } from "@/lib/ai";
import { normalizeAssessment } from "@/lib/normalize";
import { analyzeInput, analyzePrompt } from "@/lib/prompts";

export const maxDuration = 60;

const CHUNK_SIZE = 25;

type AIAssessments = { assessments?: Record<string, unknown>[] };

export async function POST(req: Request) {
  const { domainId, rows } = (await req.json()) as { domainId: string; rows: Row[] };
  const domain = getDomain(domainId);
  const started = Date.now();

  if (!domain || !Array.isArray(rows)) {
    return Response.json({ error: "Send a domainId and rows" }, { status: 400 });
  }

  const rulesResponse = (error: string) =>
    Response.json({
      assessments: rows.map((row) => normalizeAssessment(undefined, row, domain)),
      meta: { mode: "rules", ms: Date.now() - started, error },
    });

  if (!aiConfig().ready) return rulesResponse("No API key, so built-in rules were used");

  try {
    const results = [];

    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
      const chunk = rows.slice(i, i + CHUNK_SIZE);
      results.push(
        await generateJSON<AIAssessments>({
          system: analyzePrompt(domain),
          prompt: analyzeInput(domain, chunk),
        }),
      );
    }

    const byId = new Map(results.flatMap((r) => r.data.assessments ?? []).map((a) => [String(a.id), a]));

    return Response.json({
      assessments: rows.map((row) => normalizeAssessment(byId.get(row.id), row, domain)),
      meta: {
        mode: "ai",
        ms: Date.now() - started,
        model: results[0]?.model,
        cached: results.every((r) => r.cached),
      },
    });
  } catch (e) {
    return rulesResponse(`AI failed (${(e as Error).message}), so built-in rules were used`);
  }
}
