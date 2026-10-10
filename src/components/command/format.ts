import { clock, TARGET_MINUTES } from "@/er/engine";
import type { Department, Frequency, Patient, Stage, TaskKind, TaskStatus } from "@/er/types";

export type Tone = "alert" | "warn" | "ok" | "normal" | "muted";

export const TONE_TEXT: Record<Tone, string> = {
  alert: "text-alert",
  warn: "text-warn",
  ok: "text-ok",
  normal: "text-ink",
  muted: "text-ink-3",
};

export const at = (minutes: number) => clock(minutes);

export function dur(minutes: number) {
  const m = Math.max(0, Math.round(minutes));
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h${String(m % 60).padStart(2, "0")}`;
}

export function ageLabel(age: number | null) {
  if (age === null) return "—";
  if (age < 1) return `${Math.max(1, Math.round(age * 12))}mo`;
  return String(Math.round(age));
}

export function ageSex(p: Pick<Patient, "age" | "sex">) {
  return `${ageLabel(p.age)}${p.sex === "male" ? " M" : p.sex === "female" ? " F" : ""}`;
}

export function shortStaff(name: string | undefined) {
  if (!name) return "—";
  const parts = name.replace(/^(Dr\.?|Nurse)\s+/, "").split(" ");
  const last = parts[parts.length - 1];
  return name.startsWith("Dr") ? `Dr ${last}` : `${parts[0]} ${last[0]}.`;
}

export function staffName(d: Department, id: string | null) {
  if (!id) return undefined;
  return d.doctors.find((x) => x.id === id)?.name ?? d.nurses.find((x) => x.id === id)?.name;
}

export function bedLabel(d: Department, p: Patient) {
  return d.beds.find((b) => b.id === p.bedId)?.label;
}

export function isActive(p: Patient) {
  return p.stage === "waiting" || p.stage === "with_doctor" || p.stage === "awaiting_results" || p.stage === "awaiting_bed";
}

export function onCorridor(p: Patient) {
  return !p.bedId && (p.stage === "with_doctor" || p.stage === "awaiting_results" || p.stage === "awaiting_bed");
}

export function doorStatus(d: Department, p: Patient): { code: string; tone: Tone } {
  if (p.stage === "waiting") {
    const waited = d.now - p.arrivedAt;
    const target = TARGET_MINUTES[p.level];
    if (waited > target) return { code: `${dur(waited - target)} overdue`, tone: "alert" };
    if (target - waited <= 0) return { code: "Needs a doctor now", tone: "warn" };
    if (target - waited <= 5) return { code: `Due in ${dur(target - waited)}`, tone: "warn" };
    return { code: `Waiting ${dur(waited)}`, tone: "normal" };
  }
  if (p.stage === "with_doctor") return { code: "With a doctor", tone: "ok" };
  if (p.stage === "awaiting_results") return { code: `Tests · ${dur((p.stageEndsAt ?? d.now) - d.now)}`, tone: "normal" };
  if (p.stage === "awaiting_bed") return { code: `Waiting for ${DESTINATION_LABEL[p.needs.destination].toLowerCase()}`, tone: "warn" };
  return { code: STAGE_LABEL[p.stage], tone: "muted" };
}

export const STAGE_LABEL: Record<Stage, string> = {
  waiting: "Waiting for a doctor",
  with_doctor: "With a doctor",
  awaiting_results: "Waiting for results",
  awaiting_bed: "Waiting for a ward bed",
  admitted: "On the ward",
  discharged: "Discharged",
  left: "Left without being seen",
  redirected: "Sent to the clinic",
  transferred: "Transferred",
};

export const KIND_LABEL: Record<TaskKind, string> = {
  see_doctor: "First assessment",
  medication: "Medication",
  iv_fluids: "IV fluids",
  dressing: "Dressing",
  vitals: "Observations",
  review: "Doctor review",
  test: "Test",
  other: "Care",
};

export const KIND_GLYPH: Record<TaskKind, string> = {
  see_doctor: "glyph-ring",
  medication: "glyph-circle",
  iv_fluids: "glyph-diamond",
  dressing: "glyph-square",
  vitals: "glyph-triangle",
  review: "glyph-plus",
  test: "glyph-bar",
  other: "glyph-square",
};

export const STATUS_TONE: Record<TaskStatus, Tone> = {
  overdue: "alert",
  due: "warn",
  upcoming: "normal",
  done: "muted",
};

export const FREQ_LABEL: Record<Frequency, string> = {
  once: "Once",
  every_4h: "Every 4 h",
  every_6h: "Every 6 h · QID",
  every_8h: "Every 8 h · TDS",
  every_12h: "Every 12 h · BD",
  daily: "Daily · OD",
  as_needed: "When needed · SOS",
};

export const DESTINATION_LABEL = { discharge: "Home", ward: "Ward", icu: "ICU", theatre: "Theatre" } as const;

export function initials(name: string) {
  return name
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() || "?";
}
