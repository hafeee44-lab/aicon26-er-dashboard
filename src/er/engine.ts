import type {
  Action,
  ActionKind,
  Bed,
  Capacity,
  Department,
  Doctor,
  Intake,
  Kpis,
  Level,
  Needs,
  Patient,
  Policy,
  Resource,
  Stage,
  Vitals,
  Zone,
} from "./types";

export const LEVELS: Level[] = [1, 2, 3, 4, 5];
export const ZONES: Zone[] = ["resus", "acute", "fasttrack"];

const CONSULT_MINUTES: Record<Level, number> = { 1: 30, 2: 25, 3: 20, 4: 15, 5: 10 };
const RESULTS_BASE = 30;
const RESULTS_PER_RESOURCE = 15;
const LEAVE_AFTER = 180;
const RELEASE_EVERY: Capacity = { ward: 45, icu: 180, theatre: 120 };
const MAX_FREE: Capacity = { ward: 8, icu: 2, theatre: 1 };
const DONE: Stage[] = ["admitted", "discharged", "left", "redirected", "transferred"];

const GROUP: Record<Resource, string> = {
  labs: "labs",
  ecg: "simple_imaging",
  xray: "simple_imaging",
  ct: "advanced_imaging",
  ultrasound: "advanced_imaging",
  iv_fluids: "iv_fluids",
  iv_meds: "iv_meds",
  specialist: "specialist",
  procedure: "procedure",
  complex_procedure: "procedure",
};

const isString = (f: string | false): f is string => typeof f === "string";
const average = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

export function resourceCount(resources: Resource[]) {
  return new Set(resources.map((r) => GROUP[r])).size + (resources.includes("complex_procedure") ? 1 : 0);
}

export function dangerVitals(age: number | null, v: Vitals) {
  const years = age ?? 30;
  const [hr, rr] = years < 0.25 ? [180, 50] : years < 3 ? [160, 40] : years < 8 ? [140, 30] : [100, 20];

  return [
    v.hr !== null && v.hr > hr && `Heart rate ${v.hr} (danger zone above ${hr})`,
    v.rr !== null && v.rr > rr && `Breathing rate ${v.rr} (danger zone above ${rr})`,
    v.spo2 !== null && v.spo2 < 92 && `Oxygen ${v.spo2}% (danger zone below 92%)`,
  ].filter(isString);
}

export function triage(intake: Intake, needs: Needs): { level: Level; flags: string[] } {
  const v = intake.vitals;

  const critical = [
    v.spo2 !== null && v.spo2 < 90 && `Oxygen ${v.spo2}% (below 90%)`,
    (v.consciousness === "pain" || v.consciousness === "unresponsive") && "Responds only to pain or not at all",
  ].filter(isString);

  if (critical.length) return { level: 1, flags: critical };

  const high = [
    v.consciousness === "voice" && "Confused or drowsy",
    v.pain !== null && v.pain >= 7 && `Severe pain (${v.pain}/10)`,
    v.sbp !== null && v.sbp < 90 && `Low blood pressure (${v.sbp} systolic)`,
    ...dangerVitals(intake.age, v),
    needs.highRisk && "High-risk situation",
  ].filter(isString);

  if (high.length) return { level: 2, flags: high };

  const count = resourceCount(needs.resources);
  return { level: count === 0 ? 5 : count === 1 ? 4 : 3, flags: [] };
}

export function initialDepartment(policy: Policy = "smart"): Department {
  const beds = (zone: Zone, prefix: string, n: number): Bed[] =>
    Array.from({ length: n }, (_, i) => ({ id: `${prefix.toLowerCase()}${i + 1}`, zone, label: `${prefix}${i + 1}`, patientId: null }));

  const doctors: Doctor[] = [
    { id: "d1", name: "Dr. Ayesha Khan", specialty: "emergency", onShift: true },
    { id: "d2", name: "Dr. Bilal Ahmed", specialty: "emergency", onShift: true },
    { id: "d3", name: "Dr. Sana Malik", specialty: "medicine", onShift: true },
    { id: "d4", name: "Dr. Hamid Raza", specialty: "surgery", onShift: true },
    { id: "d5", name: "Dr. Farah Siddiqui", specialty: "cardiology", onShift: true },
    { id: "d6", name: "Dr. Nadia Hussain", specialty: "obgyn", onShift: true },
    { id: "d7", name: "Dr. Omar Farooq", specialty: "paediatrics", onShift: true },
    { id: "d8", name: "Dr. Kamran Ali", specialty: "orthopaedics", onShift: true },
    { id: "d9", name: "Dr. Zara Sheikh", specialty: "emergency", onShift: false },
  ];

  return {
    now: 0,
    policy,
    patients: [],
    doctors,
    beds: [...beds("resus", "R", 2), ...beds("acute", "A", 8), ...beds("fasttrack", "F", 6)],
    free: { ward: 4, icu: 1, theatre: 1 },
  };
}

export function admit(dept: Department, intake: Intake, needs: Needs, review: string[] = []): Department {
  const d = structuredClone(dept);
  const { level, flags } = triage(intake, needs);

  d.patients.push({
    ...intake,
    id: `p${d.patients.length + 1}`,
    arrivedAt: d.now,
    level,
    flags,
    needs,
    review,
    stage: "waiting",
    doctorId: null,
    bedId: null,
    seenAt: null,
    stageEndsAt: null,
    doneAt: null,
  });

  allocateIn(d);
  return d;
}

export function surge(dept: Department, cases: { intake: Intake; needs: Needs }[]): Department {
  return cases.reduce((d, c) => admit(d, c.intake, c.needs), dept);
}

export function allocate(dept: Department): Department {
  const d = structuredClone(dept);
  allocateIn(d);
  return d;
}

export function tick(dept: Department, minutes = 1): Department {
  const d = structuredClone(dept);

  for (let i = 0; i < minutes; i++) {
    d.now += 1;
    release(d);
    for (const p of d.patients) advance(d, p);
    allocateIn(d);
  }

  return d;
}

export function setPolicy(dept: Department, policy: Policy): Department {
  const d = structuredClone(dept);
  d.policy = policy;
  allocateIn(d);
  return d;
}

export function apply(dept: Department, kind: ActionKind): Department {
  const d = structuredClone(dept);

  if (kind === "call_doctor") {
    const backup = d.doctors.find((doc) => !doc.onShift);
    if (backup) backup.onShift = true;
  }

  if (kind === "open_overflow") {
    const n = d.beds.filter((b) => b.label.startsWith("O")).length;
    for (let i = 1; i <= 4; i++) d.beds.push({ id: `o${n + i}`, zone: "acute", label: `O${n + i}`, patientId: null });
  }

  if (kind === "free_beds") d.free.ward += 2;

  for (const p of d.patients) {
    if (kind === "redirect_minor" && p.stage === "waiting" && p.level >= 4) finish(d, p, "redirected");
    if (kind === "transfer" && p.stage === "awaiting_bed") finish(d, p, "transferred");
  }

  allocateIn(d);
  return d;
}

export function simulate(arrivals: { at: number; intake: Intake; needs: Needs }[], policy: Policy, minutes: number): Department {
  let d = initialDepartment(policy);

  for (let t = 0; t <= minutes; t++) {
    for (const a of arrivals.filter((x) => x.at === t)) d = admit(d, a.intake, a.needs);
    if (t < minutes) d = tick(d);
  }

  return d;
}

export function kpis(d: Department): Kpis {
  const waiting = d.patients.filter((p) => p.stage === "waiting");
  const waits = waiting.map((p) => d.now - p.arrivedAt);
  const seen = d.patients.filter((p) => p.seenAt !== null);
  const onShift = d.doctors.filter((doc) => doc.onShift);
  const byZone = (keep: (b: Bed) => boolean) =>
    Object.fromEntries(ZONES.map((z) => [z, d.beds.filter((b) => b.zone === z && keep(b)).length])) as Record<Zone, number>;

  const timeToDoctor = Object.fromEntries(
    LEVELS.map((level) => {
      const times = seen.filter((p) => p.level === level).map((p) => (p.seenAt ?? p.arrivedAt) - p.arrivedAt);
      return [level, times.length ? Math.round(average(times)) : null];
    }),
  ) as Record<Level, number | null>;

  return {
    waiting: waiting.length,
    criticalWaiting: waiting.filter((p) => p.level <= 2).length,
    avgWait: waits.length ? Math.round(average(waits)) : 0,
    longestWait: waits.length ? Math.max(...waits) : 0,
    timeToDoctor,
    bedsFree: byZone((b) => !b.patientId),
    bedsTotal: byZone(() => true),
    doctorsBusy: onShift.filter((doc) => isBusy(d, doc)).length,
    doctorsOnShift: onShift.length,
    boarding: d.patients.filter((p) => p.stage === "awaiting_bed").length,
    corridor: d.patients.filter((p) => !p.bedId && p.stage !== "waiting" && !isDone(p)).length,
    leftWithoutBeingSeen: d.patients.filter((p) => p.stage === "left").length,
    free: { ...d.free },
  };
}

export function actions(d: Department): Action[] {
  const k = kpis(d);
  const minor = d.patients.filter((p) => p.stage === "waiting" && p.level >= 4).length;
  const allBusy = k.doctorsBusy === k.doctorsOnShift;
  const hasBackup = d.doctors.some((doc) => !doc.onShift);

  const list: (Action | false)[] = [
    k.criticalWaiting > 0 &&
      allBusy &&
      hasBackup && {
        kind: "call_doctor",
        severity: "critical",
        title: "Critical patients have no doctor",
        detail: `${k.criticalWaiting} level 1–2 patients are waiting and every doctor is busy. Call the backup doctor now.`,
      },
    k.criticalWaiting === 0 &&
      allBusy &&
      hasBackup &&
      k.waiting >= 6 && {
        kind: "call_doctor",
        severity: "warning",
        title: "Every doctor is busy",
        detail: `${k.waiting} patients are waiting for a doctor. Consider calling the backup doctor.`,
      },
    (k.criticalWaiting > 0 || k.corridor > 0) &&
      k.bedsFree.resus + k.bedsFree.acute === 0 && {
        kind: "open_overflow",
        severity: "critical",
        title: "No acute beds for critical patients",
        detail: `${k.corridor} patients are being treated on corridor trolleys and every acute bed is full. Open the overflow area.`,
      },
    k.boarding >= 2 && {
      kind: "free_beds",
      severity: "warning",
      title: "Admitted patients are blocking ER beds",
      detail: `${k.boarding} admitted patients are still waiting for a ward, ICU or theatre slot. Ask the bed manager to speed up ward discharges.`,
    },
    minor >= 5 && {
      kind: "redirect_minor",
      severity: "warning",
      title: "Too many minor cases waiting",
      detail: `${minor} level 4–5 patients are waiting. Send them to the outpatient clinic.`,
    },
    k.boarding > 0 &&
      k.free.ward === 0 &&
      k.free.icu === 0 && {
        kind: "transfer",
        severity: "warning",
        title: "Hospital beds are full",
        detail: "No ward or ICU beds are free. Start transfers to nearby hospitals.",
      },
  ];

  return list.filter((a): a is Action => Boolean(a));
}

export function isBusy(d: Department, doctor: Doctor) {
  return d.patients.some((p) => p.doctorId === doctor.id && p.stage === "with_doctor");
}

export function isDone(p: Patient) {
  return DONE.includes(p.stage);
}

export function clock(minutes: number, start = 8 * 60) {
  const total = start + minutes;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function allocateIn(d: Department) {
  const queue = d.patients.filter((p) => p.stage === "waiting").sort((a, b) => priority(d, a) - priority(d, b) || a.arrivedAt - b.arrivedAt);

  const corridor = d.patients.filter((p) => !p.bedId && p.stage !== "waiting" && !isDone(p)).sort((a, b) => a.level - b.level);

  for (const p of corridor) placeInBed(d, p, queue);
  for (const p of queue) if (!p.bedId) placeInBed(d, p, queue);
  for (const p of queue) if (p.bedId || (d.policy === "smart" && p.level <= 2)) startConsult(d, p, queue);
}

function urgentWithout(queue: Patient[], p: Patient, missing: "bedId" | "doctorId") {
  return queue.some((q) => q !== p && q.stage === "waiting" && q.level <= 3 && !q[missing]);
}

function priority(d: Department, p: Patient) {
  if (d.policy === "first_come") return 0;
  return p.level - Math.min((d.now - p.arrivedAt) / 90, 1.5);
}

function placeInBed(d: Department, p: Patient, queue: Patient[]) {
  const freeIn = (zone: Zone) => d.beds.filter((b) => b.zone === zone && !b.patientId);
  const resusSpare = freeIn("resus").length > 1;

  const zones: Zone[] =
    d.policy === "first_come"
      ? ["acute", "fasttrack", "resus"]
      : p.level === 1
        ? ["resus", "acute"]
        : p.level === 2
          ? resusSpare
            ? ["acute", "resus"]
            : ["acute"]
          : p.level === 3
            ? ["acute", "fasttrack"]
            : urgentWithout(queue, p, "bedId")
              ? ["fasttrack"]
              : ["fasttrack", "acute"];

  const bed = zones.map((z) => freeIn(z)[0]).find(Boolean);
  if (!bed) return;

  bed.patientId = p.id;
  p.bedId = bed.id;
}

function startConsult(d: Department, p: Patient, queue: Patient[]) {
  const doctor = pickDoctor(d, p, queue);
  if (!doctor) return;

  p.doctorId = doctor.id;
  p.stage = "with_doctor";
  p.seenAt = d.now;
  p.stageEndsAt = d.now + CONSULT_MINUTES[p.level];
}

function pickDoctor(d: Department, p: Patient, queue: Patient[]) {
  const free = d.doctors.filter((doc) => doc.onShift && !isBusy(d, doc));
  if (d.policy === "first_come") return free[0];

  const match = free.find((doc) => doc.specialty === p.needs.specialty) ?? free.find((doc) => doc.specialty === "emergency");
  if (match) return match;

  return p.level <= 3 || !urgentWithout(queue, p, "doctorId") ? free[0] : undefined;
}

function release(d: Department) {
  for (const key of ["ward", "icu", "theatre"] as const) {
    if (d.now % RELEASE_EVERY[key] === 0) d.free[key] = Math.min(MAX_FREE[key], d.free[key] + 1);
  }
}

function advance(d: Department, p: Patient) {
  if (p.stage === "waiting" && p.level >= 4 && d.now - p.arrivedAt >= LEAVE_AFTER) return finish(d, p, "left");
  if (p.stage === "awaiting_bed") return board(d, p);
  if (p.stageEndsAt === null || d.now < p.stageEndsAt) return;

  if (p.stage === "with_doctor") {
    const count = resourceCount(p.needs.resources);
    if (!count) return decide(d, p);

    p.stage = "awaiting_results";
    p.stageEndsAt = d.now + RESULTS_BASE + RESULTS_PER_RESOURCE * count;
    return;
  }

  if (p.stage === "awaiting_results") decide(d, p);
}

function decide(d: Department, p: Patient) {
  p.stageEndsAt = null;
  if (p.needs.destination === "discharge") return finish(d, p, "discharged");

  p.stage = "awaiting_bed";
  board(d, p);
}

function board(d: Department, p: Patient) {
  const destination = p.needs.destination;
  if (destination === "discharge" || d.free[destination] <= 0) return;

  d.free[destination] -= 1;
  finish(d, p, "admitted");
}

function finish(d: Department, p: Patient, stage: Stage) {
  p.stage = stage;
  p.doneAt = d.now;
  p.stageEndsAt = null;

  const bed = d.beds.find((b) => b.patientId === p.id);
  if (bed) bed.patientId = null;
  p.bedId = null;
}
