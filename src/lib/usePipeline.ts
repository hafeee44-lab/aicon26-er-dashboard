"use client";

import { useState } from "react";
import { sampleRows, type Assessment, type Domain, type Metric, type Row } from "@/domains";
import { csvToRows } from "./csv";
import type { AnalyzeResponse, Attachment, ExtractResponse, Language, StepMeta, Summary, SummarizeResponse } from "./types";

export type PipelineInput =
  | { kind: "sample" }
  | { kind: "csv"; text: string; name: string }
  | { kind: "text"; text: string }
  | { kind: "file"; file: Attachment; name: string };

export type StepId = "ingest" | "extract" | "analyze" | "impact" | "summary";

export type Step = {
  status: "waiting" | "running" | "done" | "skipped" | "fallback" | "error";
  detail?: string;
  meta?: StepMeta;
};

export const STEP_IDS: StepId[] = ["ingest", "extract", "analyze", "impact", "summary"];

const freshSteps = () =>
  Object.fromEntries(STEP_IDS.map((id) => [id, { status: "waiting" }])) as Record<StepId, Step>;

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? `Request failed (${res.status})`);
  return json;
}

export function usePipeline(domain: Domain) {
  const [steps, setSteps] = useState(freshSteps);
  const [rows, setRows] = useState<Row[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [language, setLanguage] = useState<Language>("en");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setStep = (id: StepId, step: Step) => setSteps((prev) => ({ ...prev, [id]: step }));

  const failRunningStep = (message: string) =>
    setSteps((prev) =>
      Object.fromEntries(
        Object.entries(prev).map(([id, s]) => [id, s.status === "running" ? { status: "error", detail: message } : s]),
      ) as Record<StepId, Step>,
    );

  async function summarize(lang: Language, m: Metric[], r: Row[], a: Assessment[]) {
    setStep("summary", { status: "running" });

    const top = [...a]
      .sort((x, y) => y.score - x.score)
      .slice(0, 5)
      .map((x) => ({
        name: String(r.find((row) => row.id === x.id)?.[domain.titleKey] ?? x.id),
        risk: x.risk,
        reason: x.reason,
        action: x.action,
      }));

    const res = await post<SummarizeResponse>("/api/summarize", { domainId: domain.id, language: lang, metrics: m, top });
    setSummary(res.summary);
    setStep("summary", {
      status: res.meta.mode === "ai" ? "done" : "fallback",
      detail: lang === "ur" ? "Written in Urdu" : "Written for " + domain.audience,
      meta: res.meta,
    });
  }

  async function run(input: PipelineInput) {
    setRunning(true);
    setError(null);
    setSteps(freshSteps());
    setRows([]);
    setAssessments([]);
    setMetrics([]);
    setSummary(null);

    try {
      setStep("ingest", { status: "running" });

      let data = input.kind === "sample" ? sampleRows(domain) : input.kind === "csv" ? csvToRows(domain, input.text) : null;

      if (data) {
        setStep("ingest", { status: "done", detail: `${data.length} ${domain.entityPlural} loaded` });
        setStep("extract", { status: "skipped", detail: "Data was already structured" });
      } else {
        setStep("ingest", {
          status: "done",
          detail: input.kind === "file" ? `Read ${input.name}` : input.kind === "csv" ? `${input.name} has unfamiliar columns` : "Text received",
        });
        setStep("extract", { status: "running" });

        const res = await post<ExtractResponse>("/api/extract", {
          domainId: domain.id,
          text: input.kind === "csv" || input.kind === "text" ? input.text : undefined,
          file: input.kind === "file" ? input.file : undefined,
        });

        data = res.rows;
        setStep("extract", { status: "done", detail: `${data.length} ${domain.entityPlural} extracted`, meta: res.meta });
      }

      if (!data.length) throw new Error(`No ${domain.entityPlural} found in the input`);
      setRows(data);

      setStep("analyze", { status: "running" });
      const analysis = await post<AnalyzeResponse>("/api/analyze", { domainId: domain.id, rows: data });
      const flagged = analysis.assessments.filter((a) => a.risk !== "low").length;
      setAssessments(analysis.assessments);
      setStep("analyze", {
        status: analysis.meta.mode === "ai" ? "done" : "fallback",
        detail: `${flagged} of ${data.length} need action`,
        meta: analysis.meta,
      });

      const m = domain.impact(data, analysis.assessments);
      setMetrics(m);
      setStep("impact", { status: "done", detail: `${m[0].label}: ${m[0].value}` });

      await summarize(language, m, data, analysis.assessments);
    } catch (e) {
      const message = (e as Error).message;
      setError(message);
      failRunningStep(message);
    } finally {
      setRunning(false);
    }
  }

  async function changeLanguage(lang: Language) {
    setLanguage(lang);
    if (!metrics.length || running) return;

    try {
      await summarize(lang, metrics, rows, assessments);
    } catch (e) {
      failRunningStep((e as Error).message);
    }
  }

  return { steps, rows, assessments, metrics, summary, language, running, error, run, changeLanguage };
}
