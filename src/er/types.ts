import type { Attachment, Language, StepMeta } from "@/lib/types";

export type Level = 1 | 2 | 3 | 4 | 5;

export type Specialty = "emergency" | "medicine" | "surgery" | "cardiology" | "obgyn" | "paediatrics" | "orthopaedics";

export type Resource =
  | "labs"
  | "ecg"
  | "xray"
  | "ct"
  | "ultrasound"
  | "iv_fluids"
  | "iv_meds"
  | "specialist"
  | "procedure"
  | "complex_procedure";

export type Destination = "discharge" | "ward" | "icu" | "theatre";

export type Zone = "resus" | "acute" | "fasttrack";

export type Stage =
  | "waiting"
  | "with_doctor"
  | "awaiting_results"
  | "awaiting_bed"
  | "admitted"
  | "discharged"
  | "left"
  | "redirected"
  | "transferred";

export type Consciousness = "alert" | "voice" | "pain" | "unresponsive";

export type Policy = "first_come" | "smart";

export type Vitals = {
  hr: number | null;
  rr: number | null;
  sbp: number | null;
  dbp: number | null;
  spo2: number | null;
  temp: number | null;
  pain: number | null;
  consciousness: Consciousness | null;
};

export type Intake = {
  name: string;
  age: number | null;
  sex: "male" | "female" | null;
  complaint: string;
  vitals: Vitals;
  note: string;
};

export type Needs = {
  specialty: Specialty;
  resources: Resource[];
  destination: Destination;
  highRisk: boolean;
  reason: string;
};

export type TaskKind = "see_doctor" | "medication" | "iv_fluids" | "dressing" | "vitals" | "review" | "test" | "other";

export type TaskRole = "doctor" | "nurse";

export type TaskStatus = "upcoming" | "due" | "overdue" | "done";

export type Frequency = "once" | "every_4h" | "every_6h" | "every_8h" | "every_12h" | "daily" | "as_needed";

export type CareOrder = {
  kind: Exclude<TaskKind, "see_doctor">;
  title: string;
  frequency: Frequency;
  source: string;
  suggested: boolean;
};

export type CarePlan = {
  problems: string[];
  orders: CareOrder[];
  review: string[];
  confirmedAt: number | null;
};

export type CareTask = {
  id: string;
  patientId: string;
  kind: TaskKind;
  title: string;
  role: TaskRole;
  ownerId: string | null;
  dueAt: number;
  doneAt: number | null;
  escalatedAt: number | null;
  source: string;
};

export type TaskView = CareTask & {
  status: TaskStatus;
  lateBy: number;
  patientName: string;
  ownerName: string;
};

export type CaseSource = {
  dataset: string;
  row: number;
  expertLevel: Level;
  nurseLevel: Level;
  outcome: string;
};

export type Patient = Intake & {
  id: string;
  arrivedAt: number;
  level: Level;
  flags: string[];
  needs: Needs;
  review: string[];
  stage: Stage;
  doctorId: string | null;
  bedId: string | null;
  seenAt: number | null;
  stageEndsAt: number | null;
  doneAt: number | null;
  nurseId: string | null;
  plan: CarePlan | null;
  source?: CaseSource;
};

export type Doctor = { id: string; name: string; specialty: Specialty; onShift: boolean };

export type Nurse = { id: string; name: string };

export type Bed = { id: string; zone: Zone; label: string; patientId: string | null };

export type Capacity = { ward: number; icu: number; theatre: number };

export type Department = {
  now: number;
  policy: Policy;
  patients: Patient[];
  doctors: Doctor[];
  nurses: Nurse[];
  beds: Bed[];
  free: Capacity;
  tasks: CareTask[];
};

export type Kpis = {
  waiting: number;
  criticalWaiting: number;
  avgWait: number;
  longestWait: number;
  timeToDoctor: Record<Level, number | null>;
  bedsFree: Record<Zone, number>;
  bedsTotal: Record<Zone, number>;
  doctorsBusy: number;
  doctorsOnShift: number;
  boarding: number;
  corridor: number;
  leftWithoutBeingSeen: number;
  free: Capacity;
  tasksDue: number;
  tasksOverdue: number;
  tasksOnTime: number | null;
};

export type ActionKind = "free_beds" | "open_overflow" | "call_doctor" | "redirect_minor" | "transfer" | "escalate_tasks";

export type Action = {
  kind: ActionKind;
  severity: "warning" | "critical";
  title: string;
  detail: string;
};

export type SurgeCase = { intake: Intake; needs: Needs; source?: CaseSource };

export type Arrival = SurgeCase & { at: number };

export type IntakeRequest = { note: string; files?: Attachment[] };
export type IntakeResponse = { intake: Intake; needs: Needs; review: string[]; meta: StepMeta };

export type CareRequest = {
  note: string;
  files?: Attachment[];
  patient?: { age: number | null; sex: "male" | "female" | null; complaint: string };
};
export type CareResponse = { plan: Omit<CarePlan, "confirmedAt">; meta: StepMeta };

export type AdviseRequest = { kpis: Kpis; actions: Action[]; language: Language };
export type AdviseResponse = { message: string; meta: StepMeta };

export type TriageScore = {
  n: number;
  exact: number;
  withinOne: number;
  under: number;
  over: number;
  urgentTotal: number;
  urgentMissed: number;
};

export type ShiftResult = {
  waitByExpertLevel: Record<Level, number | null>;
  urgentWait: { avg: number; p90: number };
  minorWait: number;
  seen: number;
  leftWithoutBeingSeen: number;
  corridor: number;
};

export type ShiftEvidence = {
  name: "typical" | "busy" | "peak";
  perHour: number;
  minutes: number;
  runs: number;
  arrivals: number;
  firstCome: ShiftResult;
  smart: ShiftResult;
};

export type Evidence = {
  source: string;
  visits: number;
  triage: { nurse: TriageScore; ours: TriageScore; codeOnly: TriageScore };
  level1: { total: number; ours: number; nurse: number };
  confusion: { ours: number[][]; nurse: number[][] };
  reading: { fieldsChecked: number; correct: number; invented: number };
  admitted: {
    byOurLevel: Record<Level, number | null>;
    byExpertLevel: Record<Level, number | null>;
    raised: { expertLevel: Level; raised: number; kept: number; raisedCount: number; keptCount: number }[];
  };
  destinationCorrect: number;
  shifts: ShiftEvidence[];
  care: {
    cases: number;
    photos: number;
    ordersExpected: number;
    ordersFound: number;
    kindRight: number;
    frequencyRight: number;
    extraOrders: number;
    stoppedOrdersScheduled: number;
    stoppedOrdersTotal: number;
    missingFrequencyFlagged: number;
    missingFrequencyCases: number;
  };
};
