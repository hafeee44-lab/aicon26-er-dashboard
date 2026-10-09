import demoAnswers from "@/er/demo-answers.json";
import { cleanIntake, cleanNeeds, cleanReview, parseNote, RULES_NEEDS } from "@/er/intake";
import { intakePrompt } from "@/er/prompts";
import type { IntakeRequest, IntakeResponse } from "@/er/types";
import { aiConfig, generateJSON } from "@/lib/ai";

export const maxDuration = 60;

type SavedAnswer = Omit<IntakeResponse, "meta"> & { model: string };

const saved = demoAnswers as Record<string, SavedAnswer>;

export async function POST(req: Request) {
  const { note } = (await req.json()) as IntakeRequest;
  const started = Date.now();

  if (typeof note !== "string" || !note.trim()) {
    return Response.json({ error: "Send a note" }, { status: 400 });
  }

  const demo = new URL(req.url).searchParams.has("fresh") ? undefined : saved[note.trim()];
  if (demo) {
    const { model, ...answer } = demo;
    return Response.json({ ...answer, meta: { mode: "ai", ms: Date.now() - started, model, cached: true } });
  }

  const rulesResponse = (error: string) =>
    Response.json({
      intake: parseNote(note),
      needs: RULES_NEEDS,
      review: ["needs"],
      meta: { mode: "rules", ms: Date.now() - started, error },
    });

  if (!aiConfig().ready) return rulesResponse("No API key, so built-in rules were used");

  try {
    const result = await generateJSON<{ intake?: unknown; needs?: unknown; unsure?: unknown }>({
      system: intakePrompt(),
      prompt: `Note:\n${note.slice(0, 4000)}`,
    });

    return Response.json({
      intake: cleanIntake(result.data.intake, note),
      needs: cleanNeeds(result.data.needs),
      review: cleanReview(result.data.unsure),
      meta: { mode: "ai", ms: result.ms, model: result.model, cached: result.cached },
    });
  } catch (e) {
    return rulesResponse(`AI failed (${(e as Error).message}), so built-in rules were used`);
  }
}
