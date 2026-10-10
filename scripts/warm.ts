import { readFileSync, writeFileSync } from "node:fs";
import { demoKey } from "../src/er/demo-key.ts";
import { demoCareNotes, demoCharts, demoNotes, demoSlips } from "../src/er/demo-notes.ts";
import { triage } from "../src/er/engine.ts";
import type { CareRequest, CareResponse, IntakeResponse } from "../src/er/types.ts";

const BASE = process.env.WARM_URL ?? "http://localhost:3000";
const onlySlips = process.argv.includes("slips");

async function post<T>(path: string, body: unknown) {
  const res = await fetch(`${BASE}${path}?fresh=1`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  return (await res.json()) as T & { meta?: { mode: string; model?: string; error?: string } };
}

let failed = 0;
const fail = (label: string, error?: string) => {
  failed++;
  console.log(`FAILED (${error ?? "no answer"}): ${label}`);
};

const intake: Record<string, Omit<IntakeResponse, "meta"> & { model: string }> = onlySlips ? JSON.parse(readFileSync("src/er/demo-answers.json", "utf8")) : {};
for (const note of onlySlips ? [] : demoNotes) {
  const body = await post<IntakeResponse>("/api/intake", { note });
  if (body.meta?.mode !== "ai") {
    fail(note, body.meta?.error);
    continue;
  }
  const { level, flags } = triage(body.intake, body.needs);
  console.log(`intake L${level} ${body.needs.specialty} -> ${body.needs.destination} [${flags.join("; ")}]\n   ${note}`);
  intake[note] = { intake: body.intake, needs: body.needs, review: body.review, model: body.meta.model ?? "" };
}

for (const slip of demoSlips) {
  const files = [{ mimeType: slip.mimeType, data: readFileSync(`public${slip.src}`).toString("base64") }];
  const body = await post<IntakeResponse & { error?: string }>("/api/intake", { note: "", files });
  if (body.meta?.mode !== "ai") {
    fail(slip.label, body.meta?.error ?? body.error);
    continue;
  }
  const { level, flags } = triage(body.intake, body.needs);
  console.log(`photo L${level} ${body.needs.specialty} -> ${body.needs.destination} [${flags.join("; ")}]\n   ${slip.label}: ${body.intake.note.replaceAll("\n", " / ")}`);
  intake[demoKey("", files)] = { intake: body.intake, needs: body.needs, review: body.review, model: body.meta.model ?? "" };
}

const care: Record<string, { plan: CareResponse["plan"]; model: string }> = {};
const careInputs: [string, CareRequest][] = onlySlips ? [] : [
  ...demoCareNotes.map((note): [string, CareRequest] => [note.split("\n")[0], { note }]),
  ...demoCharts.map((c): [string, CareRequest] => [c.label, { note: "", files: [{ mimeType: c.mimeType, data: readFileSync(`public${c.src}`).toString("base64") }] }]),
];
for (const [label, req] of careInputs) {
  const body = await post<CareResponse>("/api/care", req);
  if (body.meta?.mode !== "ai") {
    fail(label, body.meta?.error);
    continue;
  }
  console.log(`care ${body.plan.orders.length} orders, problems: ${body.plan.problems.join("; ")}${body.plan.review.length ? ` | unsure: ${body.plan.review.join("; ")}` : ""}\n   ${label}`);
  care[demoKey(req.note, req.files)] = { plan: body.plan, model: body.meta.model ?? "" };
}

if (failed) {
  console.log(`${failed} demo input(s) failed, so the saved answers were not changed. Run again in a minute.`);
  process.exitCode = 1;
} else {
  writeFileSync("src/er/demo-answers.json", `${JSON.stringify(intake, null, 1)}\n`);
  if (!onlySlips) writeFileSync("src/er/demo-care.json", `${JSON.stringify(care, null, 1)}\n`);
  console.log(`Saved ${Object.keys(intake).length} intake${onlySlips ? "" : ` and ${Object.keys(care).length} care`} answers.`);
}
