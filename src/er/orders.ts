import type { CareOrder, CarePlan, Frequency } from "./types";

export const ORDER_KINDS: CareOrder["kind"][] = ["medication", "iv_fluids", "dressing", "vitals", "review", "test", "other"];

export const FREQUENCIES: Frequency[] = ["once", "every_4h", "every_6h", "every_8h", "every_12h", "daily", "as_needed"];

type Raw = Record<string, unknown>;

const record = (v: unknown): Raw => (v && typeof v === "object" ? (v as Raw) : {});
const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const texts = (v: unknown, max: number, count: number) => (Array.isArray(v) ? v.map((x) => text(x, max)).filter(Boolean).slice(0, count) : []);

export function cleanPlan(value: unknown): Omit<CarePlan, "confirmedAt"> {
  const raw = record(value);
  const orders = (Array.isArray(raw.orders) ? raw.orders : [])
    .map((o): CareOrder => {
      const r = record(o);
      return {
        kind: ORDER_KINDS.includes(r.kind as CareOrder["kind"]) ? (r.kind as CareOrder["kind"]) : "other",
        title: text(r.title, 80),
        frequency: FREQUENCIES.includes(r.frequency as Frequency) ? (r.frequency as Frequency) : "once",
        source: text(r.source, 160),
        suggested: false,
      };
    })
    .filter((o) => o.title)
    .slice(0, 20);

  return { problems: texts(raw.problems, 120, 6), orders, review: texts(raw.unsure, 140, 6) };
}

const FREQUENCY_RULES: [RegExp, Frequency][] = [
  [/\b(prn|sos|as needed|when needed|zaroorat)\b/i, "as_needed"],
  [/\b(qid|q6h|6 ?(hourly|hrly|ghante))\b/i, "every_6h"],
  [/\b(q4h|4 ?(hourly|hrly|ghante))\b/i, "every_4h"],
  [/\b(tds|tid|q8h|8 ?(hourly|hrly|ghante)|thrice)\b/i, "every_8h"],
  [/\b(bd|bid|q12h|12 ?(hourly|hrly|ghante)|twice)\b/i, "every_12h"],
  [/\b(od|daily|once a day|roz|rozana)\b/i, "daily"],
];

const KIND_RULES: [RegExp, CareOrder["kind"]][] = [
  [/\b(drip|ringer|rl|ns|normal saline|dns|d5w?|dextrose|iv fluids?|infusion)\b/i, "iv_fluids"],
  [/\b(dressing|bandage|wound care|pati)\b/i, "dressing"],
  [/\b(cbc|x-?ray|cxr|ultrasound|usg|lft|rft|bsr|sugar|ecg|labs?|test|culture)\b/i, "test"],
  [/\b(vitals|bp|pulse|temp|spo2|sats?|monitor\w*|chart)\b/i, "vitals"],
  [/\b(review|consult\w*|visit|round)\b/i, "review"],
  [/\b(inj|tab|cap|syp|syrup|neb\w*|insulin|mg|ml|drops?)\b/i, "medication"],
];

export function parseOrders(note: string): Omit<CarePlan, "confirmedAt"> {
  const orders: CareOrder[] = note
    .split(/[\n;]+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line) => {
      const kind = KIND_RULES.find(([re]) => re.test(line))?.[1];
      if (!kind) return [];
      return [{ kind, title: line.slice(0, 80), frequency: FREQUENCY_RULES.find(([re]) => re.test(line))?.[1] ?? "once", source: line.slice(0, 160), suggested: false }];
    });

  return {
    problems: [],
    orders,
    review: [orders.length ? "Read with simple rules because the AI was unavailable. Check every order." : "No orders could be read. Add them by hand."],
  };
}
