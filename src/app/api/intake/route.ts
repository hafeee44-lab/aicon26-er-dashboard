import { cleanFiles } from "@/er/attachments";
import demoAnswers from "@/er/demo-answers.json";
import { demoKey } from "@/er/demo-key";
import { cleanIntake, cleanNeeds, cleanReview, cleanTranscript, parseNote, RULES_NEEDS } from "@/er/intake";
import { intakeInput, intakePrompt } from "@/er/prompts";
import type { IntakeRequest, IntakeResponse } from "@/er/types";
import { aiConfig, generateJSON } from "@/lib/ai";

export const maxDuration = 60;

type SavedAnswer = Omit<IntakeResponse, "meta"> & { model: string };

const saved = demoAnswers as Record<string, SavedAnswer>;

export async function POST(req: Request) {
  const body = (await req.json()) as IntakeRequest;
  const started = Date.now();
  const raw = typeof body?.note === "string" ? body.note : "";
  const note = raw.trim();
  const files = cleanFiles(body?.files);

  if (!note && !files.length) {
    return Response.json({ error: "Send a note or attach a photo" }, { status: 400 });
  }

  const demo = new URL(req.url).searchParams.has("fresh") ? undefined : saved[files.length ? demoKey(note, files) : note];
  if (demo) {
    const { model, ...answer } = demo;
    return Response.json({ ...answer, meta: { mode: "ai", ms: Date.now() - started, model, cached: true } });
  }

  const rulesResponse = (error: string) =>
    note
      ? Response.json({
          intake: parseNote(raw),
          needs: RULES_NEEDS,
          review: ["needs"],
          meta: { mode: "rules", ms: Date.now() - started, error: files.length ? `${error}. The photo was not read` : error },
        })
      : Response.json({ error: "The AI is not available, so the photo could not be read. Type the note instead." }, { status: 503 });

  const cfg = aiConfig();
  if (!cfg.ready) return rulesResponse("No API key, so built-in rules were used");

  try {
    const result = await generateJSON<{ transcript?: unknown; intake?: unknown; needs?: unknown; unsure?: unknown }>(
      { system: intakePrompt(files.length > 0), prompt: intakeInput(raw, files.length), ...(files.length ? { files } : {}) },
      { timeLimitMs: files.length ? cfg.timeLimitMs * 2 : undefined },
    );
    const text = [note ? raw : "", cleanTranscript(result.data.transcript)].filter(Boolean).join("\n");

    return Response.json({
      intake: cleanIntake(result.data.intake, text),
      needs: cleanNeeds(result.data.needs),
      review: cleanReview(result.data.unsure),
      meta: { mode: "ai", ms: result.ms, model: result.model, cached: result.cached },
    });
  } catch (e) {
    return rulesResponse(`AI failed (${(e as Error).message}), so built-in rules were used`);
  }
}
