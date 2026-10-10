import { isBusy } from "@/er/engine";
import type { Department, Doctor, Nurse, TaskView } from "@/er/types";
import { dur, isActive, SPECIALTY_LABEL, STATUS_TONE, TONE_TEXT, type Tone } from "./format";
import { taskCode } from "./Tasks";
import { Avatar, Button, Glyph, LevelTile, Micro } from "./ui";

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

function Status({ tone, children }: { tone: Tone; children: string }) {
  return <span className={`font-mono text-[11px] font-bold tracking-[0.06em] uppercase ${TONE_TEXT[tone]}`}>{children}</span>;
}

export function DoctorCard({ dept, doc, tasks, onOpen, onCallBackup }: { dept: Department; doc: Doctor; tasks: TaskView[]; onOpen: (id: string) => void; onCallBackup?: () => void }) {
  const p = dept.patients.find((x) => x.doctorId === doc.id && x.stage === "with_doctor");
  const seen = dept.patients.filter((x) => x.doctorId === doc.id && x.seenAt !== null && x.seenAt >= 0).length;
  const reviews = tasks.filter((t) => t.ownerId === doc.id && t.status !== "done");
  const late = reviews.filter((t) => t.status === "overdue").length;

  return (
    <li className={`flex min-w-0 flex-col gap-3 bg-bg p-4 ${doc.onShift ? "" : "bg-panel"}`}>
      <div className="flex items-center gap-3">
        <Avatar name={doc.name} muted={!doc.onShift} />
        <div className="min-w-0">
          <div className="truncate text-[14px] font-bold">{doc.name}</div>
          <div className="truncate text-[12px] text-ink-3">{SPECIALTY_LABEL[doc.specialty]}</div>
        </div>
      </div>
      {!doc.onShift ? <Status tone="muted">Backup · off shift</Status> : p ? <Status tone="warn">{`With a patient · ${dur(dept.now - (p.seenAt ?? dept.now))}`}</Status> : <Status tone="ok">Free</Status>}
      {p && (
        <button type="button" onClick={() => onOpen(p.id)} className="flex items-center gap-2.5 border border-line px-2.5 py-2 text-left hover:border-ink-3 hover:bg-raised">
          <LevelTile level={p.level} size="sm" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-bold">{p.name}</span>
            <span className="block truncate text-[12px] text-ink-3">{p.complaint}</span>
          </span>
          <span aria-hidden className="text-ink-3">
            →
          </span>
        </button>
      )}
      {!doc.onShift && onCallBackup && (
        <Button size="sm" onClick={onCallBackup} className="self-start">
          Call in now
        </Button>
      )}
      <div className="mt-auto font-mono text-[11px] text-ink-3">
        {doc.onShift ? `${seen} seen this shift` : "Joins the shift when called"}
        {reviews.length > 0 && ` · ${plural(reviews.length, "review")} open`}
        {late > 0 && <span className="font-bold text-alert"> · {late} late</span>}
      </div>
    </li>
  );
}

export function NurseCard({ dept, nurse, tasks, onOpen }: { dept: Department; nurse: Nurse; tasks: TaskView[]; onOpen: (id: string) => void }) {
  const open = tasks.filter((t) => t.ownerId === nurse.id && t.status !== "done");
  const late = open.filter((t) => t.status === "overdue").length;
  const patients = dept.patients.filter((p) => p.nurseId === nurse.id && (isActive(p) || p.stage === "admitted")).length;
  const next = open[0];

  return (
    <li className="flex min-w-0 flex-col gap-3 bg-bg p-4">
      <div className="flex items-center gap-3">
        <Avatar name={nurse.name} />
        <div className="min-w-0">
          <div className="truncate text-[14px] font-bold">{nurse.name}</div>
          <div className="truncate text-[12px] text-ink-3">
            {plural(patients, "patient")} · {plural(open.length, "open task")}
          </div>
        </div>
      </div>
      {late ? <Status tone="alert">{`${late} overdue`}</Status> : <Status tone="ok">On schedule</Status>}
      {next ? (
        <button type="button" onClick={() => onOpen(next.patientId)} className="mt-auto flex items-center gap-2.5 border border-line px-2.5 py-2 text-left hover:border-ink-3 hover:bg-raised">
          <Glyph kind={next.kind} status={next.status} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-bold">{next.title}</span>
            <span className="block truncate text-[12px] text-ink-3">{next.patientName}</span>
          </span>
          <span className={`flex-none font-mono text-[11px] font-bold ${TONE_TEXT[STATUS_TONE[next.status]]}`}>{taskCode(next, dept.now)}</span>
        </button>
      ) : (
        <div className="mt-auto text-[12px] text-ink-3">Nothing on the list</div>
      )}
    </li>
  );
}

export function DoctorGrid({ dept, tasks, onOpen, onCallBackup }: { dept: Department; tasks: TaskView[]; onOpen: (id: string) => void; onCallBackup?: () => void }) {
  return (
    <ul className="grid gap-px bg-line sm:grid-cols-3">
      {dept.doctors.map((doc) => (
        <DoctorCard key={doc.id} dept={dept} doc={doc} tasks={tasks} onOpen={onOpen} onCallBackup={onCallBackup} />
      ))}
    </ul>
  );
}

export function CareTeam({ dept, tasks, onOpen, onCallBackup }: { dept: Department; tasks: TaskView[]; onOpen: (id: string) => void; onCallBackup?: () => void }) {
  const onShift = dept.doctors.filter((doc) => doc.onShift);
  const busy = onShift.filter((doc) => isBusy(dept, doc)).length;
  const late = tasks.filter((t) => t.status === "overdue" && dept.nurses.some((n) => n.id === t.ownerId)).length;

  return (
    <>
      <div className="flex h-9 items-center justify-between gap-3 border-b border-line px-4">
        <Micro>Doctors · {busy} of {onShift.length} with a patient</Micro>
        <Micro className="hidden sm:inline">Doctors own reviews</Micro>
      </div>
      <DoctorGrid dept={dept} tasks={tasks} onOpen={onOpen} onCallBackup={onCallBackup} />
      <div className="flex h-9 items-center justify-between gap-3 border-y border-line px-4">
        <Micro className={late ? "text-alert!" : ""}>Nurses · {late ? `${late} overdue` : "on schedule"}</Micro>
        <Micro className="hidden sm:inline">Nurses own medicines, drips, dressings, observations and tests</Micro>
      </div>
      <ul className="grid gap-px bg-line sm:grid-cols-2 xl:grid-cols-4">
        {dept.nurses.map((n) => (
          <NurseCard key={n.id} dept={dept} nurse={n} tasks={tasks} onOpen={onOpen} />
        ))}
      </ul>
    </>
  );
}
