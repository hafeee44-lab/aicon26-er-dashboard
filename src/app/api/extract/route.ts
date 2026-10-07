import { getDomain } from "@/domains";
import { AIError, aiConfig, generateJSON, type Attachment } from "@/lib/ai";
import { normalizeRecords } from "@/lib/normalize";
import { extractPrompt } from "@/lib/prompts";

export const maxDuration = 60;

type Body = { domainId: string; text?: string; file?: Attachment };

export async function POST(req: Request) {
  const { domainId, text, file } = (await req.json()) as Body;
  const domain = getDomain(domainId);

  if (!domain) return Response.json({ error: "Unknown domain" }, { status: 400 });
  if (!text?.trim() && !file) return Response.json({ error: "Send some text or a file" }, { status: 400 });

  try {
    const result = await generateJSON<{ records?: Record<string, unknown>[] }>(
      {
        system: extractPrompt(domain),
        prompt: text ? `Input:\n${text.slice(0, 60_000)}` : `Extract every ${domain.entity} from the attached file.`,
        files: file ? [file] : undefined,
      },
      { timeLimitMs: aiConfig().timeLimitMs * 2 },
    );

    const { rows, review } = normalizeRecords(domain, result.data.records ?? []);

    return Response.json({
      rows,
      review,
      meta: { mode: "ai", ms: result.ms, model: result.model, cached: result.cached },
    });
  } catch (e) {
    const status = e instanceof AIError && e.status >= 400 && e.status < 600 ? e.status : 500;
    return Response.json({ error: (e as Error).message }, { status });
  }
}
