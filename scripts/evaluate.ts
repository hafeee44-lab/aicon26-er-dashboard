import { readFileSync, writeFileSync } from "node:fs";
import { triage } from "../src/er/engine.ts";
import { RULES_NEEDS } from "../src/er/intake.ts";
import type { Consciousness, Intake, IntakeResponse, Level } from "../src/er/types.ts";

const API = process.env.EVAL_URL ?? "http://localhost:3000/api/intake";
const COUNT = process.argv[2] === "all" ? Infinity : Number(process.argv[2] ?? 300);
const SEED = 2026;
const GAP_MS = Number(process.env.EVAL_GAP_MS ?? 4500);

type Row = Record<string, string> & { index: number };
type Pair = { expert: Level; got: Level };

const MENTAL: Record<string, Consciousness> = { "1": "alert", "2": "voice", "3": "pain", "4": "unresponsive" };
const MENTAL_TEXT: Record<string, string> = { "1": "Alert", "2": "Drowsy, responds to voice", "3": "Responds only to pain", "4": "Unresponsive" };
const ARRIVAL: Record<string, string> = {
  "1": "Walked in",
  "2": "Brought by ambulance",
  "3": "Came by private car",
  "4": "Came by private ambulance",
  "5": "Brought by police",
  "6": "Came in a wheelchair",
};
const ADMITTED = ["2", "3", "7"];

function parseCsv(text: string) {
  const lines: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field.replace(/\r$/, ""));
      lines.push(row);
      row = [];
      field = "";
    } else field += c;
  }

  const [header, ...rest] = lines;
  return rest.map((cells, index) => ({ ...Object.fromEntries(header.map((h, i) => [h, cells[i] ?? ""])), index }) as Row);
}

function value(v: string) {
  const n = Number(v);
  return v.trim() !== "" && Number.isFinite(n) ? n : null;
}

function noteFor(r: Row) {
  const vital = (label: string, v: string, unit = "") => (value(v) === null ? "" : `${label} ${v}${unit}`);
  const bp = value(r.SBP) !== null && value(r.DBP) !== null ? `BP ${r.SBP}/${r.DBP}` : "";
  const pain = value(r.NRS_pain) !== null ? `Pain ${r.NRS_pain}/10` : r.Pain === "2" ? "No pain" : "In pain";

  return [
    `${Math.round(Number(r.Age))}${r.Sex === "1" ? "F" : "M"}, ${r.Chief_complain}${r.Injury === "2" ? " (injury)" : ""}`,
    ARRIVAL[r["Arrival mode"]],
    [bp, vital("HR", r.HR), vital("RR", r.RR), vital("T", r.BT), vital("SpO2", r.Saturation, "%")].filter(Boolean).join(", "),
    pain,
    MENTAL_TEXT[r.Mental],
  ]
    .filter(Boolean)
    .join(". ");
}

function truth(r: Row): Intake {
  return {
    name: "",
    age: Math.round(Number(r.Age)),
    sex: r.Sex === "1" ? "female" : "male",
    complaint: r.Chief_complain,
    vitals: {
      hr: value(r.HR),
      rr: value(r.RR),
      sbp: value(r.SBP),
      dbp: value(r.DBP),
      spo2: value(r.Saturation),
      temp: value(r.BT),
      pain: value(r.NRS_pain),
      consciousness: MENTAL[r.Mental] ?? null,
    },
    note: noteFor(r),
  };
}

function shuffle<T>(list: T[], seed: number) {
  let s = seed;
  const rand = () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function inTurn<T>(items: T[], fn: (item: T) => Promise<IntakeResponse | null>) {
  const out: (IntakeResponse | null)[] = [];

  for (const item of items) {
    const res = await fn(item);
    out.push(res);
    if (out.length % 25 === 0) console.log(`  ${out.length}/${items.length}`);
    if (!res?.meta.cached) await new Promise((r) => setTimeout(r, GAP_MS));
  }

  return out;
}

async function readNote(note: string): Promise<IntakeResponse | null> {
  try {
    const res = await fetch(API, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ note }) });
    return res.ok ? ((await res.json()) as IntakeResponse) : null;
  } catch {
    return null;
  }
}

const pct = (k: number, n: number) => (n ? Math.round((k / n) * 1000) / 10 : 0);

function metrics(pairs: Pair[]) {
  const n = pairs.length;
  const urgent = pairs.filter((p) => p.expert <= 2);

  return {
    n,
    exact: pct(pairs.filter((p) => p.got === p.expert).length, n),
    withinOne: pct(pairs.filter((p) => Math.abs(p.got - p.expert) <= 1).length, n),
    under: pct(pairs.filter((p) => p.got > p.expert).length, n),
    over: pct(pairs.filter((p) => p.got < p.expert).length, n),
    urgentTotal: urgent.length,
    urgentMissed: urgent.filter((p) => p.got >= 3).length,
  };
}

function confusion(pairs: Pair[]) {
  const m = Array.from({ length: 5 }, () => [0, 0, 0, 0, 0]);
  for (const p of pairs) m[p.expert - 1][p.got - 1]++;
  return m;
}

function readAccuracy(results: { truth: Intake; read: Intake }[]) {
  const keys = ["hr", "rr", "sbp", "dbp", "spo2", "temp", "pain", "consciousness"] as const;
  let checked = 0;
  let correct = 0;
  let invented = 0;

  for (const { truth: t, read } of results) {
    for (const k of keys) {
      const a = t.vitals[k];
      const b = read.vitals[k];
      if (k === "pain" && a === null) continue;
      checked++;
      if (a === null && b !== null) invented++;
      if (a === b || (typeof a === "number" && typeof b === "number" && Math.abs(a - b) < 0.05)) correct++;
    }
    checked += 2;
    if (read.age !== null && t.age !== null && Math.abs(read.age - t.age) <= 1) correct++;
    if (read.sex === t.sex) correct++;
  }

  return { fieldsChecked: checked, correct: pct(correct, checked), invented };
}

async function main() {
  const all = parseCsv(readFileSync("data/ktas/moon2019.csv", "utf8"));
  const critical = all.filter((r) => r.KTAS_expert === "1");
  const rest = shuffle(
    all.filter((r) => r.KTAS_expert !== "1"),
    SEED,
  );
  const sample = [...critical, ...rest].slice(0, Math.min(COUNT, all.length)).sort((a, b) => a.index - b.index);

  console.log(`Evaluating ${sample.length} of ${all.length} visits (expert level 1s first) against ${API}`);

  const responses = await inTurn(sample, (r) => readNote(noteFor(r)));

  const rows = sample.map((r, i) => {
    const res = responses[i];
    const ok = res !== null && res.meta.mode === "ai";
    const ours = ok ? triage(res.intake, res.needs) : null;

    return {
      row: r.index + 2,
      note: noteFor(r),
      expert: Number(r.KTAS_expert) as Level,
      nurse: Number(r.KTAS_RN) as Level,
      codeOnly: triage(truth(r), RULES_NEEDS).level,
      ours: ours?.level ?? null,
      flags: ours?.flags ?? [],
      needs: ok ? res.needs : null,
      disposition: r.Disposition,
      model: res?.meta.model ?? null,
      error: ok ? null : (res?.meta.error ?? "request failed"),
      read: ok ? res.intake : null,
    };
  });

  const done = rows.filter((r) => r.ours !== null);
  const pairs = (key: "nurse" | "ours" | "codeOnly") => done.map((r) => ({ expert: r.expert, got: r[key] as Level }));
  const known = done.filter((r) => r.disposition === "1" || ADMITTED.includes(r.disposition));
  const admitted = known.filter((r) => ADMITTED.includes(r.disposition));
  const discharged = known.filter((r) => r.disposition === "1");
  const predictsAdmit = (r: (typeof rows)[number]) => r.needs?.destination !== "discharge";
  const truths = new Map(sample.map((r) => [r.index + 2, truth(r)]));

  const summary = {
    source: "Moon et al. 2019, PLOS ONE 14(9): e0216972 (CC BY 4.0)",
    dataset: { visits: all.length, expertLevels: Object.fromEntries([1, 2, 3, 4, 5].map((l) => [l, all.filter((r) => r.KTAS_expert === String(l)).length])) },
    sample: { visits: sample.length, evaluated: done.length, failed: rows.length - done.length, seed: SEED, allLevel1Included: true },
    models: Object.fromEntries([...new Set(done.map((r) => r.model))].map((m) => [m, done.filter((r) => r.model === m).length])),
    triage: { nurse: metrics(pairs("nurse")), ours: metrics(pairs("ours")), codeOnly: metrics(pairs("codeOnly")) },
    confusion: { rows: "expert level 1-5", columns: "our level 1-5", ours: confusion(pairs("ours")), nurse: confusion(pairs("nurse")) },
    reading: readAccuracy(done.map((r) => ({ truth: truths.get(r.row)!, read: r.read! }))),
    disposition: {
      known: known.length,
      correct: pct(known.filter((r) => predictsAdmit(r) === ADMITTED.includes(r.disposition)).length, known.length),
      admittedCaught: pct(admitted.filter(predictsAdmit).length, admitted.length),
      dischargedCorrect: pct(discharged.filter((r) => !predictsAdmit(r)).length, discharged.length),
    },
  };

  writeFileSync("data/ktas/evaluation.json", JSON.stringify({ summary, rows }, null, 1));

  console.log(JSON.stringify(summary, null, 1));
  for (const r of rows.filter((r) => r.error).slice(0, 5)) console.log(`failed row ${r.row}: ${r.error}`);
}

main();
