import { readFileSync, writeFileSync } from "node:fs";
import { arrivalsFrom, simulate } from "../src/er/engine.ts";
import type { Department, Evidence, Level, Policy, ShiftEvidence, ShiftResult, SurgeCase, TriageScore } from "../src/er/types.ts";

const RUNS = 20;
const MINUTES = 240;
const RATES: [ShiftEvidence["name"], number][] = [
  ["typical", 7],
  ["busy", 12],
  ["peak", 17],
];
const LEVELS: Level[] = [1, 2, 3, 4, 5];
const ADMITTED = ["2", "3", "6", "7"];

type EvalRow = { expert: Level; nurse: Level; ours: Level | null; disposition: string };
type Evaluation = {
  summary: {
    source: string;
    triage: Record<"nurse" | "ours" | "codeOnly", TriageScore>;
    confusion: { ours: number[][]; nurse: number[][] };
    reading: Evidence["reading"];
    disposition: { correct: number };
  };
  rows: EvalRow[];
};

const round = (n: number) => Math.round(n * 10) / 10;
const average = (xs: number[]) => (xs.length ? round(xs.reduce((a, b) => a + b, 0) / xs.length) : null);
const percentile = (xs: number[], p: number) => {
  const sorted = [...xs].sort((a, b) => a - b);
  return sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))] : 0;
};

function waits(d: Department) {
  return d.patients.filter((p) => p.source).map((p) => ({ expert: p.source!.expertLevel, wait: (p.seenAt ?? p.doneAt ?? d.now) - p.arrivedAt }));
}

function shiftResult(cases: SurgeCase[], perHour: number, policy: Policy): ShiftResult {
  const runs = Array.from({ length: RUNS }, (_, i) => simulate(arrivalsFrom(cases, perHour, MINUTES, i + 1), policy, MINUTES));
  const all = runs.flatMap(waits);
  const urgent = all.filter((w) => w.expert <= 2).map((w) => w.wait);
  const perRun = (f: (d: Department) => number) => average(runs.map(f)) ?? 0;

  return {
    waitByExpertLevel: Object.fromEntries(LEVELS.map((l) => [l, average(all.filter((w) => w.expert === l).map((w) => w.wait))])) as Record<Level, number | null>,
    urgentWait: { avg: average(urgent) ?? 0, p90: percentile(urgent, 0.9) },
    minorWait: average(all.filter((w) => w.expert >= 4).map((w) => w.wait)) ?? 0,
    seen: perRun((d) => d.patients.filter((p) => p.seenAt !== null).length),
    leftWithoutBeingSeen: perRun((d) => d.patients.filter((p) => p.stage === "left").length),
    corridor: perRun((d) => d.patients.filter((p) => !p.bedId && ["with_doctor", "awaiting_results", "awaiting_bed"].includes(p.stage)).length),
  };
}

function admittedRate(rows: EvalRow[]) {
  return rows.length ? Math.round((rows.filter((r) => ADMITTED.includes(r.disposition)).length / rows.length) * 100) : null;
}

type CareEvaluation = {
  summary: Omit<Evidence["care"], "missingFrequencyFlagged" | "missingFrequencyCases"> & { evaluated: number };
  cases: { unsureNeeded: boolean; unsureFlagged: boolean }[];
};

const cases = JSON.parse(readFileSync("src/er/replay.json", "utf8")) as SurgeCase[];
const careEval = JSON.parse(readFileSync("data/care/evaluation.json", "utf8")) as CareEvaluation;
const { summary, rows } = JSON.parse(readFileSync("data/ktas/evaluation.json", "utf8")) as Evaluation;
const done = rows.filter((r) => r.ours !== null);

const evidence: Evidence = {
  source: summary.source,
  visits: done.length,
  triage: summary.triage,
  level1: {
    total: done.filter((r) => r.expert === 1).length,
    ours: done.filter((r) => r.expert === 1 && r.ours === 1).length,
    nurse: done.filter((r) => r.expert === 1 && r.nurse === 1).length,
  },
  confusion: summary.confusion,
  reading: summary.reading,
  admitted: {
    byOurLevel: Object.fromEntries(LEVELS.map((l) => [l, admittedRate(done.filter((r) => r.ours === l))])) as Record<Level, number | null>,
    byExpertLevel: Object.fromEntries(LEVELS.map((l) => [l, admittedRate(done.filter((r) => r.expert === l))])) as Record<Level, number | null>,
    raised: ([3, 4] as Level[]).map((l) => {
      const raised = done.filter((r) => r.expert === l && r.ours! < l);
      const kept = done.filter((r) => r.expert === l && r.ours! >= l);
      return { expertLevel: l, raised: admittedRate(raised) ?? 0, kept: admittedRate(kept) ?? 0, raisedCount: raised.length, keptCount: kept.length };
    }),
  },
  destinationCorrect: summary.disposition.correct,
  shifts: RATES.map(([name, perHour]) => ({
    name,
    perHour,
    minutes: MINUTES,
    runs: RUNS,
    arrivals: average(Array.from({ length: RUNS }, (_, i) => arrivalsFrom(cases, perHour, MINUTES, i + 1).length)) ?? 0,
    firstCome: shiftResult(cases, perHour, "first_come"),
    smart: shiftResult(cases, perHour, "smart"),
  })),
  care: {
    cases: careEval.summary.evaluated,
    photos: careEval.summary.photos,
    ordersExpected: careEval.summary.ordersExpected,
    ordersFound: careEval.summary.ordersFound,
    kindRight: careEval.summary.kindRight,
    frequencyRight: careEval.summary.frequencyRight,
    extraOrders: careEval.summary.extraOrders,
    stoppedOrdersScheduled: careEval.summary.stoppedOrdersScheduled,
    stoppedOrdersTotal: careEval.summary.stoppedOrdersTotal,
    missingFrequencyFlagged: careEval.cases.filter((c) => c.unsureNeeded && c.unsureFlagged).length,
    missingFrequencyCases: careEval.cases.filter((c) => c.unsureNeeded).length,
  },
};

writeFileSync("src/er/evidence.json", `${JSON.stringify(evidence, null, 1)}\n`);

for (const s of evidence.shifts) {
  console.log(
    `${s.name} (${s.perHour}/h, ~${s.arrivals} arrivals): urgent wait ${s.firstCome.urgentWait.avg} -> ${s.smart.urgentWait.avg} min (p90 ${s.firstCome.urgentWait.p90} -> ${s.smart.urgentWait.p90}), minor wait ${s.firstCome.minorWait} -> ${s.smart.minorWait}, seen ${s.firstCome.seen} -> ${s.smart.seen}, left ${s.firstCome.leftWithoutBeingSeen} -> ${s.smart.leftWithoutBeingSeen}, corridor ${s.firstCome.corridor} -> ${s.smart.corridor}`,
  );
}
