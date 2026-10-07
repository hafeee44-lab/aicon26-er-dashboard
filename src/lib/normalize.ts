import { riskFromScore, clamp } from "@/domains/helpers";
import type { Assessment, Domain, Field, Risk, Row, Value } from "@/domains";
import type { Review } from "./types";

function toNumber(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const match = String(v).replace(/,/g, "").match(/-?\d+(\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function toDate(v: unknown): string {
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);

  const dmy = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})$/);
  if (dmy) {
    const year = dmy[3].length === 2 ? `20${dmy[3]}` : dmy[3];
    return `${year}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  }

  const t = new Date(s);
  return Number.isNaN(t.getTime()) ? s : t.toISOString().slice(0, 10);
}

function toValue(field: Field, v: unknown): Value {
  if (v === null || v === undefined || String(v).trim() === "") return null;
  if (field.type === "number") return toNumber(v);
  if (field.type === "date") return toDate(v);
  return String(v).trim();
}

export function normalizeRecords(domain: Domain, raw: Record<string, unknown>[]): { rows: Row[]; review: Review[] } {
  const keys = new Set(domain.fields.map((f) => f.key));
  const kept = raw
    .map((r) => ({
      values: Object.fromEntries(domain.fields.map((f) => [f.key, toValue(f, r?.[f.key])])),
      unsure: Array.isArray(r?._unsure) ? r._unsure.map(String).filter((k) => keys.has(k)) : [],
    }))
    .filter((r) => Object.values(r.values).some((v) => v !== null));

  return {
    rows: kept.map((r, i) => ({ ...r.values, id: `r${i + 1}` })),
    review: kept.map((r, i) => ({ id: `r${i + 1}`, fields: r.unsure })).filter((r) => r.fields.length),
  };
}

export function normalizeRows(domain: Domain, raw: Record<string, unknown>[]): Row[] {
  return normalizeRecords(domain, raw).rows;
}

const RISKS: Risk[] = ["high", "medium", "low"];

export function normalizeAssessment(raw: Record<string, unknown> | undefined, row: Row, domain: Domain): Assessment {
  if (!raw) return { ...domain.rules(row), id: row.id, source: "rules" };

  const score = clamp(Number(raw.score) || 0);
  const risk = RISKS.includes(raw.risk as Risk) ? (raw.risk as Risk) : riskFromScore(score);
  const message = typeof raw.message === "string" ? raw.message.trim() : "";

  return {
    id: row.id,
    risk,
    score,
    reason: String(raw.reason ?? ""),
    action: String(raw.action ?? ""),
    value: Math.max(0, Number(raw.value) || 0),
    ...(message ? { message } : {}),
    source: "ai",
  };
}
