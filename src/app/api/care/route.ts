import demoCare from "@/er/demo-care.json";
import { demoKey } from "@/er/demo-key";
import { cleanPlan, parseOrders } from "@/er/orders";
import { careInput, carePrompt } from "@/er/prompts";
import type { CareRequest, CareResponse } from "@/er/types";
import { aiConfig, generateJSON, type Attachment } from "@/lib/ai";

export const maxDuration = 60;

const MAX_FILES = 4;

const saved = demoCare as Record<string, { plan: CareResponse["plan"]; model: string }>;
const MAX_FILE_CHARS = 6_000_000;

const validFile = (f: unknown): f is Attachment => {
  const file = f as Attachment;
  return (
    typeof file?.mimeType === "string" &&
    (file.mimeType.startsWith("image/") || file.mimeType === "application/pdf") &&
    typeof file.data === "string" &&
    file.data.length <= MAX_FILE_CHARS
  );
};

export async function POST(req: Request) {
  const body = (await req.json()) as CareRequest;
  const started = Date.now();
  const note = typeof body?.note === "string" ? body.note.trim() : "";
  const files = Array.isArray(body?.files) ? body.files.filter(validFile).slice(0, MAX_FILES) : [];

  if (!note && !files.length) {
    return Response.json({ error: "Send a note or attach a report" }, { status: 400 });
  }

  const demo = new URL(req.url).searchParams.has("fresh") ? undefined : saved[demoKey(note, files)];
  if (demo) return Response.json({ plan: demo.plan, meta: { mode: "ai", ms: Date.now() - started, model: demo.model, cached: true } });

  const rulesResponse = (error: string) => Response.json({ plan: parseOrders(note), meta: { mode: "rules", ms: Date.now() - started, error } });

  const cfg = aiConfig();
  if (!cfg.ready) return rulesResponse("No API key, so built-in rules were used");

  try {
    const result = await generateJSON(
      { system: carePrompt(), prompt: careInput({ ...body, note, files }), files },
      { timeLimitMs: files.length ? cfg.timeLimitMs * 2 : undefined },
    );

    return Response.json({
      plan: cleanPlan(result.data),
      meta: { mode: "ai", ms: result.ms, model: result.model, cached: result.cached },
    });
  } catch (e) {
    return rulesResponse(`AI failed (${(e as Error).message}), so built-in rules were used`);
  }
}
