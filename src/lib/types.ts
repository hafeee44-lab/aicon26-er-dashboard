import type { Assessment, Metric, Row } from "@/domains";

export type Language = "en" | "ur";

export type Attachment = { mimeType: string; data: string };

export type StepMeta = {
  mode: "ai" | "rules";
  ms: number;
  model?: string;
  cached?: boolean;
  error?: string;
};

export type Summary = {
  headline: string;
  summary: string;
  actions: string[];
};

export type Review = { id: string; fields: string[] };

export type ExtractResponse = { rows: Row[]; review?: Review[]; meta: StepMeta };
export type AnalyzeResponse = { assessments: Assessment[]; meta: StepMeta };
export type SummarizeResponse = { summary: Summary; meta: StepMeta };

export type SummarizeRequest = {
  domainId: string;
  language: Language;
  metrics: Metric[];
  top: { name: string; risk: string; reason: string; action: string }[];
};
