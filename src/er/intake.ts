import type { Consciousness, Destination, Intake, Needs, Resource, Specialty, Vitals } from "./types";

export const SPECIALTIES: Specialty[] = ["emergency", "medicine", "surgery", "cardiology", "obgyn", "paediatrics", "orthopaedics"];

export const RESOURCES: Resource[] = [
  "labs",
  "ecg",
  "xray",
  "ct",
  "ultrasound",
  "iv_fluids",
  "iv_meds",
  "specialist",
  "procedure",
  "complex_procedure",
];

const DESTINATIONS: Destination[] = ["discharge", "ward", "icu", "theatre"];
const CONSCIOUSNESS: Consciousness[] = ["alert", "voice", "pain", "unresponsive"];
const REVIEW_KEYS = ["name", "age", "sex", "complaint", "hr", "rr", "sbp", "dbp", "spo2", "temp", "pain", "consciousness", "needs"];

export const RULES_NEEDS: Needs = {
  specialty: "emergency",
  resources: ["labs"],
  destination: "discharge",
  highRisk: false,
  reason: "Built-in rules could not predict needs. The nurse should confirm them.",
};

type Raw = Record<string, unknown>;

const record = (v: unknown): Raw => (v && typeof v === "object" ? (v as Raw) : {});

function num(v: unknown, min: number, max: number) {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
}

function celsius(v: unknown) {
  const t = num(v, 25, 115);
  return t !== null && t > 45 ? Math.round((((t - 32) * 5) / 9) * 10) / 10 : t;
}

function oneOf<T extends string>(v: unknown, allowed: T[], fallback: T): T {
  return allowed.includes(v as T) ? (v as T) : fallback;
}

export function cleanIntake(value: unknown, note: string): Intake {
  const raw = record(value);
  const v = record(raw.vitals);

  return {
    name: String(raw.name ?? "").trim() || "Unknown",
    age: num(raw.age, 0, 120),
    sex: raw.sex === "male" || raw.sex === "female" ? raw.sex : null,
    complaint: String(raw.complaint ?? "").trim() || note.slice(0, 80),
    vitals: {
      hr: num(v.hr, 20, 250),
      rr: num(v.rr, 4, 80),
      sbp: num(v.sbp, 40, 300),
      dbp: num(v.dbp, 20, 200),
      spo2: num(v.spo2, 40, 100),
      temp: celsius(v.temp),
      pain: num(v.pain, 0, 10),
      consciousness: CONSCIOUSNESS.includes(v.consciousness as Consciousness) ? (v.consciousness as Consciousness) : null,
    },
    note,
  };
}

export function cleanNeeds(value: unknown): Needs {
  const raw = record(value);
  const resources = Array.isArray(raw.resources) ? raw.resources.filter((r): r is Resource => RESOURCES.includes(r as Resource)) : [];

  return {
    specialty: oneOf(raw.specialty, SPECIALTIES, "emergency"),
    resources: [...new Set(resources)],
    destination: oneOf(raw.destination, DESTINATIONS, "discharge"),
    highRisk: raw.highRisk === true,
    reason: String(raw.reason ?? "").trim(),
  };
}

export function cleanReview(value: unknown) {
  return Array.isArray(value) ? value.map(String).filter((k) => REVIEW_KEYS.includes(k)) : [];
}

function find(note: string, pattern: RegExp) {
  const m = note.match(pattern);
  return m ? m[m.length - 1] : null;
}

function consciousness(note: string): Consciousness | null {
  if (/dard pe|to pain|pain only/i.test(note)) return "pain";
  if (/unresponsive|unconscious|behosh/i.test(note)) return "unresponsive";
  if (/confus|drowsy|behki|ghunood/i.test(note)) return "voice";
  return null;
}

export function parseNote(note: string): Intake {
  const bp = note.match(/(\d{2,3})\s*\/\s*(\d{2,3})/);
  const male = /\b\d{1,3}\s*m\b|\bmale\b|\bmard\b|\badmi\b/i.test(note);
  const female = /\b\d{1,3}\s*f\b|\bfemale\b|\baurat\b|\bkhatoon\b/i.test(note);

  const vitals: Vitals = {
    hr: num(find(note, /\b(?:hr|pulse)\s*[:=]?\s*(\d{2,3})/i), 20, 250),
    rr: num(find(note, /\b(?:rr|resp)\s*[:=]?\s*(\d{1,2})/i), 4, 80),
    sbp: bp ? num(bp[1], 40, 300) : null,
    dbp: bp ? num(bp[2], 20, 200) : null,
    spo2: num(find(note, /\b(?:spo2|sats?|o2)\s*[:=]?\s*(\d{2,3})/i), 40, 100),
    temp: celsius(find(note, /\b(?:temp|t)\s*[:=]?\s*(\d{2,3}(?:\.\d)?)/i)),
    pain: num(find(note, /\bpain\s*[:=]?\s*(\d{1,2})/i), 0, 10),
    consciousness: consciousness(note),
  };

  return {
    name: "Unknown",
    age: num(find(note, /\b(\d{1,3})\s*(?:saal|sal|years?|yrs?|yo|m|f)\b/i), 0, 120),
    sex: male && !female ? "male" : female && !male ? "female" : null,
    complaint: note.slice(0, 80),
    vitals,
    note,
  };
}
