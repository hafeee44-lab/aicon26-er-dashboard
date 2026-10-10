import type {
  Action,
  ActionKind,
  Arrival,
  Bed,
  Capacity,
  CareOrder,
  CarePlan,
  CareTask,
  CaseSource,
  Department,
  Doctor,
  Frequency,
  Intake,
  Kpis,
  Level,
  Needs,
  Patient,
  Policy,
  Resource,
  Stage,
  SurgeCase,
  TaskKind,
  TaskRole,
  TaskStatus,
  TaskView,
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

export const TARGET_MINUTES: Record<Level, number> = { 1: 0, 2: 15, 3: 30, 4: 60, 5: 120 };

export const INTERVAL_MINUTES: Record<Frequency, number | null> = {
  once: null,
  every_4h: 240,
  every_6h: 360,
  every_8h: 480,
  every_12h: 720,
  daily: 1440,
  as_needed: null,
};

export const GRACE_MINUTES: Record<TaskKind, number> = {
  see_doctor: 0,
  medication: 30,
  iv_fluids: 30,
  dressing: 60,
  vitals: 30,
  review: 60,
  test: 60,
  other: 60,
};

export const TASK_ROLE: Record<TaskKind, TaskRole> = {
  see_doctor: "doctor",
  medication: "nurse",
  iv_fluids: "nurse",
  dressing: "nurse",
  vitals: "nurse",
  review: "doctor",
  test: "nurse",
  other: "nurse",
};

const PLAN_HORIZON = 24 * 60;
const FIRST_TASK_AFTER = 15;
const ACTIVE_AFTER_ER: Stage[] = ["admitted"];

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
  ].filter(isString);
}

export function triage(intake: Intake, needs: Needs): { level: Level; flags: string[] } {
  const v = intake.vitals;

  const critical = [
    v.spo2 !== null && v.spo2 < 90 && `Oxygen ${v.spo2}% (below 90%)`,
    (v.consciousness === "pain" || v.consciousness === "unresponsive") && "Responds only to pain or not at all",
  ].filter(isString);

  if (critical.length) return { level: 1, flags: critical };

  const count = resourceCount(needs.resources);

  const high = [
    v.consciousness === "voice" && "Confused or drowsy",
    v.pain !== null && v.pain >= 7 && `Severe pain (${v.pain}/10)`,
    v.sbp !== null && v.sbp < 90 && `Low blood pressure (${v.sbp} systolic)`,
    v.spo2 !== null && v.spo2 < 92 && `Oxygen ${v.spo2}% (below 92%)`,
    ...(count >= 2 ? dangerVitals(intake.age, v) : []),
    needs.highRisk && "High-risk situation",
  ].filter(isString);

  if (high.length) return { level: 2, flags: high };

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

  const nurses = [
    { id: "n1", name: "Nurse Rabia Aslam" },
    { id: "n2", name: "Nurse Saima Javed" },
    { id: "n3", name: "Nurse Tariq Mehmood" },
    { id: "n4", name: "Nurse Mehwish Iqbal" },
  ];

  return {
    now: 0,
    policy,
    patients: [],
    doctors,
    nurses,
    beds: [...beds("resus", "R", 2), ...beds("acute", "A", 8), ...beds("fasttrack", "F", 6)],
    free: { ward: 4, icu: 1, theatre: 1 },
    tasks: [],
  };
}

export function admit(dept: Department, intake: Intake, needs: Needs, review: string[] = [], source?: CaseSource): Department {
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
    nurseId: leastBusyNurse(d),
    plan: null,
    ...(source && { source }),
  });

  allocateIn(d);
  return d;
}

export function surge(dept: Department, cases: SurgeCase[]): Department {
  return cases.reduce((d, c) => admit(d, c.intake, c.needs, [], c.source), dept);
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

  if (kind === "escalate_tasks") {
    for (const t of d.tasks) if (taskStatus(d, t) === "overdue" && t.escalatedAt === null) t.escalatedAt = d.now;
  }

  for (const p of d.patients) {
    if (kind === "redirect_minor" && p.stage === "waiting" && p.level >= 4) finish(d, p, "redirected");
    if (kind === "transfer" && p.stage === "awaiting_bed") finish(d, p, "transferred");
  }

  allocateIn(d);
  return d;
}

export function planCare(dept: Department, patientId: string, draft: Omit<CarePlan, "confirmedAt">): Department {
  const d = structuredClone(dept);
  const p = d.patients.find((x) => x.id === patientId);
  if (!p) return d;

  p.plan = { ...draft, orders: [...draft.orders.map((o) => ({ ...o, suggested: false })), ...suggestOrders(p, draft.orders)], confirmedAt: null };
  return d;
}

export function confirmPlan(dept: Department, patientId: string): Department {
  const d = structuredClone(dept);
  const p = d.patients.find((x) => x.id === patientId);
  if (!p?.plan) return d;

  p.plan.confirmedAt = d.now;
  d.tasks = d.tasks.filter((t) => t.patientId !== p.id || t.doneAt !== null);
  d.tasks.push(...scheduleOrders(d, p, p.plan.orders, d.now + FIRST_TASK_AFTER));
  return d;
}

export function completeTask(dept: Department, taskId: string): Department {
  const d = structuredClone(dept);
  const task = d.tasks.find((t) => t.id === taskId);
  if (task && task.doneAt === null) task.doneAt = d.now;
  return d;
}

export function taskStatus(d: Department, t: CareTask): TaskStatus {
  if (t.doneAt !== null) return "done";
  if (d.now > t.dueAt + GRACE_MINUTES[t.kind]) return "overdue";
  return d.now >= t.dueAt ? "due" : "upcoming";
}

export function rounds(d: Department): TaskView[] {
  const order: Record<TaskStatus, number> = { overdue: 0, due: 1, upcoming: 2, done: 3 };
  const patients = new Map(d.patients.map((p) => [p.id, p]));
  const staff = new Map<string, string>([...d.doctors, ...d.nurses].map((x) => [x.id, x.name]));

  const seeDoctor: CareTask[] = d.patients
    .filter((p) => p.stage === "waiting")
    .map((p) => ({
      id: `see-${p.id}`,
      patientId: p.id,
      kind: "see_doctor",
      title: `First doctor assessment (level ${p.level})`,
      role: "doctor",
      ownerId: null,
      dueAt: p.arrivedAt + TARGET_MINUTES[p.level],
      doneAt: null,
      escalatedAt: null,
      source: `Triage target for level ${p.level}: within ${TARGET_MINUTES[p.level]} minutes`,
    }));

  const care = d.tasks.filter((t) => {
    const p = patients.get(t.patientId);
    return p && (!isDone(p) || ACTIVE_AFTER_ER.includes(p.stage));
  });

  return [...seeDoctor, ...care]
    .map((t) => {
      const status = taskStatus(d, t);
      return {
        ...t,
        status,
        lateBy: status === "done" ? Math.max(0, (t.doneAt ?? 0) - t.dueAt) : Math.max(0, d.now - t.dueAt),
        patientName: patients.get(t.patientId)?.name || "Unknown patient",
        ownerName: t.ownerId ? (staff.get(t.ownerId) ?? "Unassigned") : t.role === "doctor" ? "Next free doctor" : "Ward nurse",
      };
    })
    .sort((a, b) => order[a.status] - order[b.status] || a.dueAt - b.dueAt);
}

export function arrivalsFrom(cases: SurgeCase[], perHour: number, minutes: number, seed = 1): Arrival[] {
  let s = seed;
  const gap = () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return (-Math.log(1 - s / 4294967296) * 60) / perHour;
  };
  const start = ((seed - 1) * 53) % cases.length;
  const arrivals: Arrival[] = [];

  for (let at = gap(); at < minutes; at += gap()) {
    arrivals.push({ ...cases[(start + arrivals.length) % cases.length], at: Math.floor(at) });
  }

  return arrivals;
}

export function simulate(arrivals: Arrival[], policy: Policy, minutes: number): Department {
  let d = initialDepartment(policy);

  for (let t = 0; t <= minutes; t++) {
    for (const a of arrivals.filter((x) => x.at === t)) d = admit(d, a.intake, a.needs, [], a.source);
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

  const list = rounds(d);
  const done = list.filter((t) => t.status === "done");

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
    tasksDue: list.filter((t) => t.status === "due").length,
    tasksOverdue: list.filter((t) => t.status === "overdue").length,
    tasksOnTime: done.length ? Math.round((done.filter((t) => t.lateBy <= GRACE_MINUTES[t.kind]).length / done.length) * 100) : null,
  };
}

export function actions(d: Department): Action[] {
  const k = kpis(d);
  const minor = d.patients.filter((p) => p.stage === "waiting" && p.level >= 4).length;
  const allBusy = k.doctorsBusy === k.doctorsOnShift;
  const hasBackup = d.doctors.some((doc) => !doc.onShift);
  const late = rounds(d).filter((t) => t.kind !== "see_doctor" && t.status === "overdue" && t.escalatedAt === null);
  const worst = late.sort((a, b) => b.lateBy - a.lateBy)[0];
  const urgentLate = late.some((t) => t.kind === "medication" || t.kind === "iv_fluids");

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
    worst && {
      kind: "escalate_tasks",
      severity: urgentLate ? "critical" : "warning",
      title: late.length === 1 ? "A care task is overdue" : `${late.length} care tasks are overdue`,
      detail: `${worst.title} for ${worst.patientName} is ${worst.lateBy} minutes late (${worst.ownerName}). Escalate to the patient's doctor and the charge nurse.`,
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

function leastBusyNurse(d: Department) {
  const active = d.patients.filter((p) => !isDone(p) || ACTIVE_AFTER_ER.includes(p.stage));
  const load = (id: string) => active.filter((p) => p.nurseId === id).length;
  return [...d.nurses].sort((a, b) => load(a.id) - load(b.id))[0]?.id ?? null;
}

function careDoctor(d: Department, p: Patient) {
  return p.doctorId ?? (d.doctors.find((doc) => doc.specialty === p.needs.specialty) ?? d.doctors.find((doc) => doc.specialty === "emergency"))?.id ?? null;
}

function suggestOrders(p: Patient, orders: CareOrder[]): CareOrder[] {
  const has = (kind: CareOrder["kind"]) => orders.some((o) => o.kind === kind);
  const list: CareOrder[] = [];

  if (!has("vitals")) {
    list.push({
      kind: "vitals",
      title: "Check vital signs",
      frequency: p.level <= 2 ? "every_4h" : "every_8h",
      source: `Suggested by our rules: level ${p.level} patients need vitals every ${p.level <= 2 ? 4 : 8} hours`,
      suggested: true,
    });
  }

  if (!has("review")) {
    list.push({
      kind: "review",
      title: "Doctor review",
      frequency: "daily",
      source: "Suggested by our rules: every admitted patient needs a daily doctor review",
      suggested: true,
    });
  }

  return list;
}

function scheduleOrders(d: Department, p: Patient, orders: CareOrder[], start: number): CareTask[] {
  const tasks: CareTask[] = [];

  orders.forEach((o, i) => {
    const every = INTERVAL_MINUTES[o.frequency];
    if (o.frequency === "as_needed") return;

    for (let at = start; at < start + PLAN_HORIZON; at += every ?? PLAN_HORIZON) {
      tasks.push({
        id: `${p.id}-o${i}-${at}`,
        patientId: p.id,
        kind: o.kind,
        title: o.title,
        role: TASK_ROLE[o.kind],
        ownerId: TASK_ROLE[o.kind] === "nurse" ? p.nurseId : careDoctor(d, p),
        dueAt: at,
        doneAt: null,
        escalatedAt: null,
        source: o.suggested ? o.source : `From the notes: "${o.source}"`,
      });
      if (every === null) break;
    }
  });

  return tasks;
}

export function waitingQueue(d: Department) {
  return d.patients.filter((p) => p.stage === "waiting").sort((a, b) => priority(d, a) - priority(d, b) || a.arrivedAt - b.arrivedAt);
}

function allocateIn(d: Department) {
  const queue = waitingQueue(d);

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
