import type { Language, StepMeta } from "@/lib/types";

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
  source?: CaseSource;
};

export type Doctor = { id: string; name: string; specialty: Specialty; onShift: boolean };

export type Bed = { id: string; zone: Zone; label: string; patientId: string | null };

export type Capacity = { ward: number; icu: number; theatre: number };

export type Department = {
  now: number;
  policy: Policy;
  patients: Patient[];
  doctors: Doctor[];
  beds: Bed[];
  free: Capacity;
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
};

export type ActionKind = "free_beds" | "open_overflow" | "call_doctor" | "redirect_minor" | "transfer";

export type Action = {
  kind: ActionKind;
  severity: "warning" | "critical";
  title: string;
  detail: string;
};

export type SurgeCase = { intake: Intake; needs: Needs; source?: CaseSource };

export type Arrival = SurgeCase & { at: number };

export type IntakeRequest = { note: string };
export type IntakeResponse = { intake: Intake; needs: Needs; review: string[]; meta: StepMeta };

export type AdviseRequest = { kpis: Kpis; actions: Action[]; language: Language };
export type AdviseResponse = { message: string; meta: StepMeta };
