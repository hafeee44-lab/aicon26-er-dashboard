import { readFileSync, writeFileSync } from "node:fs";
import type { Intake, Level, Needs, SurgeCase } from "../src/er/types.ts";

const SEED = 7;
const OUTCOME: Record<string, string> = {
  "1": "discharged",
  "2": "ward",
  "3": "icu",
  "4": "left against advice",
  "5": "transferred",
  "6": "died",
  "7": "theatre",
};

type EvalRow = { row: number; note: string; expert: Level; nurse: Level; needs: Needs | null; disposition: string; read: Intake | null };
type Evaluation = { summary: { dataset: { visits: number; expertLevels: Record<string, number> } }; rows: EvalRow[] };

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

const { summary, rows } = JSON.parse(readFileSync("data/ktas/evaluation.json", "utf8")) as Evaluation;
const read = rows.filter((r) => r.read && r.needs);
const rest = read.filter((r) => r.expert !== 1);
const share = summary.dataset.expertLevels["1"] / summary.dataset.visits;
const level1 = shuffle(
  read.filter((r) => r.expert === 1),
  SEED,
).slice(0, Math.round((rest.length * share) / (1 - share)));

const cases: SurgeCase[] = shuffle([...rest, ...level1], SEED).map((r) => ({
  intake: { ...r.read!, name: `Visit ${r.row}`, note: r.note },
  needs: r.needs!,
  source: { dataset: "Moon et al. 2019", row: r.row, expertLevel: r.expert, nurseLevel: r.nurse, outcome: OUTCOME[r.disposition] ?? "unknown" },
}));

writeFileSync("src/er/replay.json", `[\n${cases.map((c) => JSON.stringify(c)).join(",\n")}\n]\n`);

const levels = [1, 2, 3, 4, 5].map((l) => `L${l} ${cases.filter((c) => c.source!.expertLevel === l).length}`).join(", ");
console.log(`Wrote ${cases.length} replay cases to src/er/replay.json (expert levels: ${levels})`);
