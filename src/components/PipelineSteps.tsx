import { STEP_IDS, type Step, type StepId } from "@/lib/usePipeline";
import { Card } from "./ui";

const LABELS: Record<StepId, { title: string; ai: boolean }> = {
  ingest: { title: "Load data", ai: false },
  extract: { title: "Extraction", ai: true },
  analyze: { title: "Risk analysis", ai: true },
  impact: { title: "Impact metrics", ai: false },
  summary: { title: "Summary", ai: true },
};

const ICON: Record<Step["status"], string> = {
  waiting: "border-zinc-200 text-zinc-300",
  running: "border-brand text-brand animate-pulse",
  done: "border-brand bg-brand text-white",
  skipped: "border-zinc-200 text-zinc-400",
  fallback: "border-amber-400 bg-amber-400 text-white",
  error: "border-red-500 bg-red-500 text-white",
};

const SYMBOL: Record<Step["status"], string> = {
  waiting: "",
  running: "•",
  done: "✓",
  skipped: "–",
  fallback: "!",
  error: "×",
};

function metaLine(step: Step) {
  const m = step.meta;
  if (!m) return null;
  if (m.mode === "rules") return "Offline rules";
  return [m.model, `${(m.ms / 1000).toFixed(1)}s`, m.cached && "cached"].filter(Boolean).join(" · ");
}

export function PipelineSteps({ steps }: { steps: Record<StepId, Step> }) {
  return (
    <Card title="2 · AI pipeline">
      <ol className="space-y-4">
        {STEP_IDS.map((id) => {
          const step = steps[id];
          const label = LABELS[id];

          return (
            <li key={id} className="flex gap-3">
              <span className={`grid size-6 shrink-0 place-items-center rounded-full border-2 text-xs font-bold ${ICON[step.status]}`}>
                {SYMBOL[step.status]}
              </span>
              <div className="min-w-0 text-sm">
                <p className="font-medium">
                  {label.title}
                  {label.ai && (
                    <span className="ml-2 rounded bg-brand/10 px-1.5 py-0.5 text-[10px] font-semibold text-brand uppercase">AI</span>
                  )}
                </p>
                {step.detail && <p className="text-zinc-500">{step.detail}</p>}
                {metaLine(step) && <p className="font-mono text-xs text-zinc-400">{metaLine(step)}</p>}
                {step.meta?.error && <p className="text-xs text-amber-600">{step.meta.error}</p>}
              </div>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
