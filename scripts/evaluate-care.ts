import { readFileSync, writeFileSync } from "node:fs";
import type { CareOrder, CareRequest, CareResponse, Frequency } from "../src/er/types.ts";

const API = process.env.EVAL_URL ?? "http://localhost:3000/api/care?fresh=1";
const GAP_MS = Number(process.env.EVAL_GAP_MS ?? 4000);

type Expected = { match: string; kinds: CareOrder["kind"][]; frequency: Frequency | null };
type Case = { id: string; style: string; note: string; image?: string; expect: Expected[]; optional?: string[]; forbidden?: string[]; flagUnsure?: boolean };

const cases = JSON.parse(readFileSync("data/care/cases.json", "utf8")) as Case[];
const test = (pattern: string, o: CareOrder) => new RegExp(pattern, "i").test(o.title);
const pct = (k: number, n: number) => (n ? Math.round((k / n) * 1000) / 10 : 0);

async function read(c: Case): Promise<CareResponse | null> {
  const files = c.image ? [{ mimeType: "image/jpeg", data: readFileSync(`data/care/${c.image}`).toString("base64") }] : undefined;
  const body: CareRequest = { note: c.note, files };
  try {
    const res = await fetch(API, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    return res.ok ? ((await res.json()) as CareResponse) : null;
  } catch {
    return null;
  }
}

function score(c: Case, orders: CareOrder[], review: string[]) {
  const left = [...orders];
  const results = c.expect.map((e) => {
    const i = left.findIndex((o) => test(e.match, o));
    const got = i >= 0 ? left.splice(i, 1)[0] : null;
    return {
      expected: e.match,
      found: Boolean(got),
      kindRight: got ? e.kinds.includes(got.kind) : false,
      frequencyChecked: Boolean(got) && e.frequency !== null,
      frequencyRight: got ? e.frequency === null || got.frequency === e.frequency : false,
      got: got ? `${got.kind} ${got.frequency}: ${got.title}` : null,
    };
  });

  const forbidden = left.filter((o) => (c.forbidden ?? []).some((f) => test(f, o)));
  const extra = left.filter((o) => !forbidden.includes(o) && !(c.optional ?? []).some((p) => test(p, o)));

  return {
    id: c.id,
    style: c.style,
    results,
    forbidden: forbidden.map((o) => o.title),
    extra: extra.map((o) => `${o.kind} ${o.frequency}: ${o.title}`),
    unsureNeeded: Boolean(c.flagUnsure),
    unsureFlagged: review.length > 0,
    review,
  };
}

const scored = [];
const failed: string[] = [];

for (const c of cases) {
  const res = await read(c);
  if (!res || res.meta.mode !== "ai") {
    failed.push(`${c.id}: ${res?.meta.error ?? "request failed"}`);
    continue;
  }
  const s = score(c, res.plan.orders, res.plan.review);
  scored.push({ ...s, model: res.meta.model ?? null, ms: res.meta.ms });
  const miss = s.results.filter((r) => !r.found || !r.kindRight || !r.frequencyRight);
  console.log(
    `${c.id} ${c.style}: ${s.results.filter((r) => r.found).length}/${s.results.length} found${miss.length ? ` | wrong: ${miss.map((m) => `${m.expected} -> ${m.got ?? "missing"}`).join("; ")}` : ""}${s.extra.length ? ` | extra: ${s.extra.join("; ")}` : ""}${s.forbidden.length ? ` | STOPPED BUT SCHEDULED: ${s.forbidden.join("; ")}` : ""}`,
  );
  await new Promise((r) => setTimeout(r, GAP_MS));
}

const all = scored.flatMap((s) => s.results);
const found = all.filter((r) => r.found);
const checked = found.filter((r) => r.frequencyChecked);

const summary = {
  cases: cases.length,
  evaluated: scored.length,
  failed,
  photos: scored.filter((s) => cases.find((c) => c.id === s.id)?.image).length,
  ordersExpected: all.length,
  ordersFound: pct(found.length, all.length),
  kindRight: pct(found.filter((r) => r.kindRight).length, found.length),
  frequencyRight: pct(checked.filter((r) => r.frequencyRight).length, checked.length),
  extraOrders: scored.reduce((n, s) => n + s.extra.length, 0),
  stoppedOrdersScheduled: scored.reduce((n, s) => n + s.forbidden.length, 0),
  stoppedOrdersTotal: cases.reduce((n, c) => n + (c.forbidden?.length ?? 0), 0),
  missingFrequencyFlagged: `${scored.filter((s) => s.unsureNeeded && s.unsureFlagged).length} of ${cases.filter((c) => c.flagUnsure).length}`,
};

writeFileSync("data/care/evaluation.json", `${JSON.stringify({ summary, cases: scored }, null, 1)}\n`);
console.log(JSON.stringify(summary, null, 1));
