"use client";

import type { Domain } from "@/domains";
import { usePipeline } from "@/lib/usePipeline";
import { ImpactCards } from "./ImpactCards";
import { InputPanel } from "./InputPanel";
import { PipelineSteps } from "./PipelineSteps";
import { ResultsTable } from "./ResultsTable";
import { RiskBreakdown } from "./RiskBreakdown";
import { SummaryCard } from "./SummaryCard";

export function Workspace({ domain }: { domain: Domain }) {
  const p = usePipeline(domain);
  const hasResults = p.assessments.length > 0;

  return (
    <main className="mx-auto grid max-w-7xl gap-6 px-4 pb-16 sm:px-6 lg:grid-cols-[360px_minmax(0,1fr)]">
      <div className="space-y-6">
        <InputPanel domain={domain} running={p.running} onRun={p.run} />
        <PipelineSteps steps={p.steps} />
      </div>

      <div className="space-y-6">
        {p.error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{p.error}</div>
        )}

        {hasResults ? (
          <>
            <ImpactCards metrics={p.metrics} />
            <div className="grid gap-6 xl:grid-cols-2">
              <SummaryCard
                summary={p.summary}
                language={p.language}
                loading={p.steps.summary.status === "running"}
                onLanguage={p.changeLanguage}
              />
              <RiskBreakdown domain={domain} assessments={p.assessments} />
            </div>
            <ResultsTable domain={domain} rows={p.rows} assessments={p.assessments} />
          </>
        ) : (
          <div className="grid min-h-80 place-items-center rounded-2xl border-2 border-dashed border-zinc-200 p-10 text-center">
            <div className="max-w-sm">
              <p className="text-lg font-semibold">3 · Impact out</p>
              <p className="mt-2 text-sm text-zinc-500">
                {p.running
                  ? "The AI is working through your data…"
                  : `Run the sample data, or upload a ${domain.photoHint.toLowerCase()}, to see the impact here.`}
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
