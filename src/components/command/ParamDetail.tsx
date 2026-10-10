import { GRACE_MINUTES, isBusy, LEVELS, TARGET_MINUTES, ZONES } from "@/er/engine";
import type { ReactNode } from "react";
import type { Action, ActionKind, Department, Kpis, Patient, TaskView, Zone } from "@/er/types";
import { ageSex, doorStatus, dur, onCorridor, shortStaff, TONE_TEXT } from "./format";
import type { ParamKey } from "./Params";
import { TaskRow } from "./Tasks";
import { Button, LevelTile, Micro } from "./ui";

const TITLE: Record<ParamKey, string> = {
  urgent: "Urgent patients waiting",
  waiting: "Everyone waiting for a first doctor",
  overdue: "Everything that is late",
  ontime: "Care done on time",
  beds: "Beds and corridor",
  doctors: "Doctors on shift",
};

const EXPLAIN: Record<ParamKey, string> = {
  urgent: "Level 1–2 patients still waiting for their first doctor. Targets: level 1 at once, level 2 within 15 minutes.",
  waiting: "In the order they are due: arrival time plus the target for their level (L1 now, L2 15m, L3 30m, L4 60m, L5 120m).",
  overdue: "First assessments past the triage target, and ward tasks past their grace window (30 min for medicines and drips, 60 for dressings, tests and reviews).",
  ontime: "Care tasks done within their grace window, out of all care tasks done this shift.",
  beds: "Free beds by zone. Corridor patients are being treated on a trolley because no bed was free.",
  doctors: "Who is with a patient right now. The backup doctor can be called in when every doctor is busy.",
};

const FIXES: Record<ParamKey, ActionKind[]> = {
  urgent: ["call_doctor", "open_overflow"],
  waiting: ["call_doctor", "redirect_minor"],
  overdue: ["escalate_tasks", "call_doctor"],
  ontime: ["escalate_tasks"],
  beds: ["open_overflow", "free_beds", "transfer"],
  doctors: ["call_doctor"],
};

const FIX_LABEL: Record<ActionKind, string> = {
  call_doctor: "Call backup doctor",
  open_overflow: "Open overflow",
  free_beds: "Ask for discharges",
  redirect_minor: "Send minor cases to clinic",
  transfer: "Start transfers",
  escalate_tasks: "Escalate overdue care",
};

const ZONE_NAME: Record<Zone, string> = { resus: "Resus", acute: "Acute", fasttrack: "Fast track" };

function PatientLine({ d, p, onOpen }: { d: Department; p: Patient; onOpen: (id: string) => void }) {
  const status = doorStatus(d, p);
  const waited = (p.seenAt ?? d.now) - p.arrivedAt;
  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(p.id)}
        className="grid w-full grid-cols-[22px_minmax(0,1fr)_auto] items-center gap-x-3 border-b border-line px-4 py-2 text-left hover:bg-raised sm:grid-cols-[22px_minmax(0,1fr)_minmax(0,1.4fr)_110px_120px]"
      >
        <LevelTile level={p.level} size="sm" />
        <span className="min-w-0 truncate font-bold">
          {p.name} <span className="font-mono text-[11px] font-normal text-ink-3">{ageSex(p)}</span>
        </span>
        <span className="hidden min-w-0 truncate text-[13px] text-ink-2 sm:block">{p.complaint}</span>
        <span className="hidden font-mono text-[12px] text-ink-2 tnum sm:block">
          {dur(waited)} / {TARGET_MINUTES[p.level] ? dur(TARGET_MINUTES[p.level]) : "now"}
        </span>
        <span className={`text-right font-mono text-[12px] font-bold ${TONE_TEXT[status.tone]}`}>{status.code}</span>
      </button>
    </li>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="px-4 py-5 text-[13px] text-ink-3">{children}</p>;
}

function Body({ kind, d, k, tasks, onOpen, onDone }: { kind: ParamKey; d: Department; k: Kpis; tasks: TaskView[]; onOpen: (id: string) => void; onDone: (t: TaskView) => void }) {
  const due = (p: Patient) => p.arrivedAt + TARGET_MINUTES[p.level];
  const waiting = d.patients.filter((p) => p.stage === "waiting").sort((a, b) => due(a) - due(b));

  if (kind === "urgent" || kind === "waiting") {
    const list = kind === "urgent" ? waiting.filter((p) => p.level <= 2) : waiting;
    const seen = LEVELS.filter((l) => k.timeToDoctor[l] !== null);
    return (
      <>
        {list.length ? <ul>{list.map((p) => <PatientLine key={p.id} d={d} p={p} onOpen={onOpen} />)}</ul> : <Empty>{kind === "urgent" ? "No level 1–2 patient is waiting." : "Nobody is waiting for a doctor."}</Empty>}
        {seen.length > 0 && (
          <p className="px-4 py-3 font-mono text-[12px] text-ink-3">
            Average time to first doctor this shift · {seen.map((l) => `L${l} ${dur(k.timeToDoctor[l] ?? 0)}`).join(" · ")}
          </p>
        )}
      </>
    );
  }

  if (kind === "overdue") {
    const late = tasks.filter((t) => t.status === "overdue").sort((a, b) => b.lateBy - a.lateBy);
    return late.length ? (
      <ul>
        {late.map((t) => (
          <TaskRow key={t.id} t={t} now={d.now} onDone={onDone} onOpen={onOpen} />
        ))}
      </ul>
    ) : (
      <Empty>Nothing is late. Every patient was seen within target and every task is within its grace window.</Empty>
    );
  }

  if (kind === "ontime") {
    const done = tasks.filter((t) => t.status === "done" && t.kind !== "see_doctor");
    const lateDone = done.filter((t) => t.lateBy > GRACE_MINUTES[t.kind]);
    const dueNow = tasks.filter((t) => t.status === "due");
    return (
      <div className="grid gap-px bg-line lg:grid-cols-2">
        <div className="bg-bg">
          <div className="flex h-9 items-center px-4">
            <Micro>
              Done this shift · {done.length - lateDone.length} on time, {lateDone.length} late
            </Micro>
          </div>
          {lateDone.length ? <ul>{lateDone.map((t) => <TaskRow key={t.id} t={t} now={d.now} onOpen={onOpen} />)}</ul> : <Empty>No task was done late.</Empty>}
        </div>
        <div className="bg-bg">
          <div className="flex h-9 items-center px-4">
            <Micro>Due now · {dueNow.length}</Micro>
          </div>
          {dueNow.length ? <ul>{dueNow.map((t) => <TaskRow key={t.id} t={t} now={d.now} onDone={onDone} onOpen={onOpen} />)}</ul> : <Empty>Nothing is due right now.</Empty>}
        </div>
      </div>
    );
  }

  if (kind === "beds") {
    const corridor = d.patients.filter(onCorridor);
    return (
      <>
        <div className="grid gap-px bg-line sm:grid-cols-3">
          {ZONES.map((z) => (
            <div key={z} className="bg-bg px-4 py-3">
              <div className="flex items-baseline justify-between">
                <Micro>{ZONE_NAME[z]}</Micro>
                <span className={`font-mono text-[13px] font-bold ${k.bedsFree[z] ? "text-ink" : "text-alert"}`}>
                  {k.bedsFree[z]} / {k.bedsTotal[z]} free
                </span>
              </div>
              <div className="mt-2 flex gap-1" aria-hidden>
                {d.beds
                  .filter((b) => b.zone === z)
                  .map((b) => {
                    const p = d.patients.find((x) => x.id === b.patientId);
                    return <span key={b.id} className={`h-3 flex-1 ${p ? `lvl-${p.level}` : "border border-line-strong"}`} style={p ? { background: "var(--lvl)" } : undefined} />;
                  })}
              </div>
            </div>
          ))}
        </div>
        <div className="flex h-9 items-center border-t border-line px-4">
          <Micro>On corridor trolleys · {corridor.length}</Micro>
        </div>
        {corridor.length ? <ul>{corridor.map((p) => <PatientLine key={p.id} d={d} p={p} onOpen={onOpen} />)}</ul> : <Empty>Nobody is on the corridor.</Empty>}
      </>
    );
  }

  const boarding = d.patients.filter((p) => p.stage === "awaiting_bed");
  return (
    <>
      <ul className="grid gap-px bg-line sm:grid-cols-2 xl:grid-cols-3">
        {d.doctors.map((doc) => {
          const p = d.patients.find((x) => x.doctorId === doc.id && x.stage === "with_doctor");
          return (
            <li key={doc.id} className="bg-bg">
              <button type="button" disabled={!p} onClick={() => p && onOpen(p.id)} className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left enabled:hover:bg-raised">
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-bold">{doc.name}</span>
                  <span className="text-[11px] text-ink-3 capitalize">{doc.specialty}</span>
                </span>
                <span className={`text-right font-mono text-[11px] font-bold ${!doc.onShift ? "text-ink-3" : isBusy(d, doc) ? "text-warn" : "text-ok"}`}>
                  {!doc.onShift ? "OFF · BACKUP" : p ? `WITH ${p.name.toUpperCase()} · ${dur(d.now - (p.seenAt ?? d.now))}` : "FREE"}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="flex h-9 items-center border-t border-line px-4">
        <Micro>Boarding · admitted, waiting for a ward bed · {boarding.length}</Micro>
      </div>
      {boarding.length ? (
        <ul>
          {boarding.map((p) => (
            <PatientLine key={p.id} d={d} p={p} onOpen={onOpen} />
          ))}
        </ul>
      ) : (
        <Empty>Nobody is boarding.</Empty>
      )}
      <p className="px-4 py-3 font-mono text-[12px] text-ink-3">
        Nurses · {d.nurses.map((n) => `${shortStaff(n.name)} ${tasks.filter((t) => t.ownerId === n.id && t.status !== "done").length} open`).join(" · ")}
      </p>
    </>
  );
}

export function ParamDetail({
  kind,
  dept,
  kpis,
  tasks,
  actions,
  onOpen,
  onDone,
  onApply,
  onClose,
}: {
  kind: ParamKey;
  dept: Department;
  kpis: Kpis;
  tasks: TaskView[];
  actions: Action[];
  onOpen: (id: string) => void;
  onDone: (t: TaskView) => void;
  onApply: (kind: ActionKind) => void;
  onClose: () => void;
}) {
  const fixes = actions.filter((a) => FIXES[kind].includes(a.kind));
  return (
    <section id="param-detail" aria-label={TITLE[kind]} className="type-in border-b border-line-strong bg-panel">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-3">
        <div className="min-w-0">
          <h2 className="text-[15px] font-bold">{TITLE[kind]}</h2>
          <p className="mt-0.5 max-w-[80ch] text-[12px] text-ink-3">{EXPLAIN[kind]}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {fixes.map((a) => (
            <Button key={a.kind} size="sm" variant={a.severity === "critical" ? "alert" : "line"} onClick={() => onApply(a.kind)}>
              {FIX_LABEL[a.kind]}
            </Button>
          ))}
          <Button size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
      <div className="thin-scroll max-h-[44vh] overflow-y-auto">
        <Body kind={kind} d={dept} k={kpis} tasks={tasks} onOpen={onOpen} onDone={onDone} />
      </div>
    </section>
  );
}
