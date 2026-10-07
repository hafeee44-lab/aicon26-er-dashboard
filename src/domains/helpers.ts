import type { Assessment, Risk, Value } from "./types";

const DAY = 86_400_000;

export function daysFromNow(n: number) {
  return new Date(Date.now() + n * DAY).toISOString().slice(0, 10);
}

export function daysUntil(date: Value) {
  const t = new Date(String(date)).getTime();
  return Number.isNaN(t) ? 0 : Math.round((t - Date.now()) / DAY);
}

export function num(v: Value) {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function sum(xs: number[]) {
  return xs.reduce((a, b) => a + b, 0);
}

export function clamp(n: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, Math.round(n)));
}

export function riskFromScore(score: number): Risk {
  if (score >= 60) return "high";
  if (score >= 30) return "medium";
  return "low";
}

export function rs(n: number) {
  return `Rs. ${Math.round(n).toLocaleString("en-US")}`;
}

export function count(n: number, total?: number) {
  return total === undefined ? n.toLocaleString("en-US") : `${n} of ${total}`;
}

export function plural(n: number, word: string) {
  const rounded = Math.round(n);
  return `${rounded.toLocaleString("en-US")} ${word}${rounded === 1 ? "" : "s"}`;
}

export function minutes(total: number) {
  return total >= 90 ? `${(total / 60).toFixed(1)} hrs` : `${Math.round(total)} min`;
}

export function flagged(assessments: Assessment[]) {
  return assessments.filter((a) => a.risk !== "low");
}

export function valueOf(assessments: Assessment[]) {
  return sum(assessments.map((a) => a.value));
}
