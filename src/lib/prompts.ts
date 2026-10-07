import type { Domain, Row } from "@/domains";
import type { Language, SummarizeRequest } from "./types";

const today = () => new Date().toISOString().slice(0, 10);

export function extractPrompt(domain: Domain) {
  const fields = domain.fields
    .map((f) => `- ${f.key} (${f.type}${f.unit ? `, ${f.unit}` : ""}): ${f.label}${f.hint ? `. ${f.hint}` : ""}`)
    .join("\n");

  return `You are the data-extraction step inside ${domain.product}, an AI tool for ${domain.domainName} in Pakistan.
Read the input (a photo, a PDF, pasted text or a messy spreadsheet; it may be in English, Urdu or Roman Urdu) and extract every ${domain.entity}.

Return JSON only, in this shape:
{"records": [{${domain.fields.map((f) => `"${f.key}": ...`).join(", ")}, "_unsure": []}]}

Fields:
${fields}

Rules:
- Numbers are plain numbers: no commas, no currency symbols.
- Dates are YYYY-MM-DD.
- Write names in English letters.
- Use null when a value is missing or unreadable. Never invent records.
- If a value is hard to read or you had to guess it, give your best reading and add its field key to "_unsure".
- Today is ${today()}.`;
}

export function analyzePrompt(domain: Domain) {
  const message = domain.message ? `, "message": "..."` : "";

  return `You are the decision engine inside ${domain.product}.

${domain.analysis}

Today is ${today()}.

Return JSON only, in this shape:
{"assessments": [{"id": "r1", "risk": "high" | "medium" | "low", "score": 0-100, "reason": "...", "action": "...", "value": 0${message}}]}

Rules:
- Exactly one assessment per input record, using the same id.
- score: 0 = no risk, 100 = act today.
- value: ${domain.valueLabel}, as a plain number.
- reason and action: one sentence each, under 25 words, in plain English.${domain.message ? `\n- message: ${domain.message}` : ""}${domain.facts ? `\n- The "calculated" values in each record were worked out exactly by code. Use them as they are; never redo that maths.` : ""}`;
}

export function analyzeInput(domain: Domain, rows: Row[]) {
  const records = domain.facts ? rows.map((r) => ({ ...r, calculated: domain.facts?.(r) })) : rows;
  return `${domain.entityPlural}:\n${JSON.stringify(records, null, 1)}`;
}

export function summaryPrompt(domain: Domain, language: Language) {
  const lang = language === "ur" ? "Urdu, in Urdu script, with simple everyday words" : "simple English";

  return `You write the final summary inside ${domain.product}. The reader is ${domain.audience}: busy and non-technical.
Write in ${lang}.

Return JSON only, in this shape:
{"headline": "max 12 words", "summary": "2-3 sentences that use the key numbers", "actions": ["3 short actions, most urgent first"]}`;
}

export function summaryInput(req: SummarizeRequest) {
  const metrics = req.metrics.map((m) => `- ${m.label}: ${m.value} (${m.hint})`).join("\n");
  const top = req.top.map((t) => `- ${t.name} [${t.risk}]: ${t.reason} -> ${t.action}`).join("\n");

  return `Impact metrics:\n${metrics}\n\nMost urgent items:\n${top}`;
}
