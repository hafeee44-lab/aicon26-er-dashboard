"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { resourceCount, TARGET_MINUTES } from "@/er/engine";
import type { CareResponse, Department, Patient, TaskView, Zone } from "@/er/types";
import { ageSex, at, AVPU_LABEL, DESTINATION_LABEL, doorStatus, dur, isActive, LEVEL_NAME, onCorridor, RESOURCE_LABEL, SPECIALTY_LABEL, STAGE_LABEL, staffName, TONE_TEXT } from "./format";
import { CarePlanner } from "./CarePlanner";
import { TaskRow } from "./Tasks";
import { AiMark, Avatar, Badge, Button, LevelTile } from "./ui";

const ZONE_NAME: Record<Zone, string> = { resus: "Resus", acute: "Acute", fasttrack: "Fast track" };
const JUMPS = [
  { id: "sheet-overview", label: "Overview" },
  { id: "sheet-care", label: "Care plan & tasks" },
  { id: "sheet-note", label: "Nurse's note" },
] as const;

type Vital = { label: string; code: string; value: string | null; unit: string; color: string; alarm: boolean };

function vitalSigns(p: Patient): Vital[] {
  const v = p.vitals;
  const adult = (p.age ?? 30) >= 8;
  return [
    { label: "Heart rate", code: "HR", value: v.hr === null ? null : String(v.hr), unit: "beats a minute", color: "text-hr", alarm: v.hr !== null && adult && v.hr > 100 },
    { label: "Blood pressure", code: "NIBP", value: v.sbp === null ? null : `${v.sbp}/${v.dbp ?? "—"}`, unit: "mmHg", color: "text-bp", alarm: v.sbp !== null && v.sbp < 90 },
    { label: "Oxygen", code: "SpO₂", value: v.spo2 === null ? null : String(v.spo2), unit: "% saturation", color: "text-spo2", alarm: v.spo2 !== null && v.spo2 < 92 },
    { label: "Breathing rate", code: "RR", value: v.rr === null ? null : String(v.rr), unit: "breaths a minute", color: "text-rr", alarm: v.rr !== null && adult && v.rr > 20 },
    { label: "Temperature", code: "TEMP", value: v.temp === null ? null : String(v.temp), unit: "°C", color: "text-temp", alarm: v.temp !== null && v.temp >= 38 },
    { label: "Pain", code: "PAIN", value: v.pain === null ? null : String(v.pain), unit: "out of 10", color: "text-ink", alarm: v.pain !== null && v.pain >= 7 },
    { label: "Consciousness", code: "AVPU", value: v.consciousness === null ? null : v.consciousness[0].toUpperCase(), unit: v.consciousness ? AVPU_LABEL[v.consciousness] : "", color: "text-ink", alarm: v.consciousness !== null && v.consciousness !== "alert" },
  ];
}

function rule(level: Patient["level"]) {
  if (level === 1) return "ESI level 1: oxygen below 90%, or the patient responds only to pain or not at all.";
  if (level === 2) return "ESI level 2: a danger sign or a high-risk situation means this patient must not wait.";
  return "ESI levels 3 to 5 count the types of test or treatment needed: two or more is level 3, one is level 4, none is level 5.";
}

function place(d: Department, p: Patient) {
  const bed = d.beds.find((b) => b.id === p.bedId);
  if (bed) return `Bed ${bed.label} · ${ZONE_NAME[bed.zone]}`;
  if (onCorridor(p)) return "Corridor trolley · no bed was free";
  if (p.stage === "waiting") return "Waiting room";
  if (p.stage === "admitted") return "Ward";
  return STAGE_LABEL[p.stage];
}

function Section({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="border-b border-line px-5 py-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[15px] font-bold">{title}</h3>
        {aside}
      </div>
      {children}
    </section>
  );
}

function Facts({ children }: { children: ReactNode }) {
  return <dl className="grid grid-cols-[120px_minmax(0,1fr)] gap-x-3 gap-y-2 text-[14px]">{children}</dl>;
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-ink-3">{label}</dt>
      <dd>{children}</dd>
    </>
  );
}

export function PatientSheet({
  dept,
  patient,
  tasks,
  onClose,
  onPlan,
  onConfirm,
  onDone,
  onPrev,
  onNext,
  position,
}: {
  dept: Department;
  patient: Patient;
  tasks: TaskView[];
  onPrev?: () => void;
  onNext?: () => void;
  position?: string;
  onClose: () => void;
  onPlan: (draft: CareResponse["plan"]) => void;
  onConfirm: () => void;
  onDone: (t: TaskView) => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const p = patient;
  const mine = tasks.filter((t) => t.patientId === p.id);
  const open = mine.filter((t) => t.status !== "done").length;
  const count = resourceCount(p.needs.resources);
  const waited = (p.seenAt ?? dept.now) - p.arrivedAt;
  const due = p.arrivedAt + TARGET_MINUTES[p.level];
  const status = doorStatus(dept, p);
  const vitals = vitalSigns(p);
  const recorded = vitals.filter((v) => v.value !== null);
  const missing = vitals.filter((v) => v.value === null).map((v) => v.label.toLowerCase());
  const needs = p.needs.resources.map((r) => RESOURCE_LABEL[r]).join(", ");
  const doctor = dept.doctors.find((x) => x.id === p.doctorId);

  useEffect(() => {
    closeRef.current?.focus();
  }, [p.id]);

  const jump = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-labelledby="sheet-title">
      <button type="button" aria-label="Close patient" className="absolute inset-0 bg-black/55" onClick={onClose} />
      <div className="thin-scroll relative flex h-full w-full max-w-[640px] flex-col overflow-y-auto border-l border-line-strong bg-bg">
        <header className="sticky top-0 z-10 border-b border-line-strong bg-bg">
          <div className="flex items-center gap-4 px-5 pt-4 pb-3">
            <Avatar name={p.name || "?"} size="lg" />
            <div className="min-w-0 flex-1">
              <h2 id="sheet-title" className="truncate text-[22px] leading-tight font-bold">
                {p.name || "Unnamed patient"}
              </h2>
              <p className="mt-0.5 line-clamp-2 text-[14px] leading-snug text-ink-2">
                <span className="font-mono">{ageSex(p)}</span> · {p.complaint}
              </p>
            </div>
            <Button ref={closeRef} size="sm" onClick={onClose} aria-keyshortcuts="Escape" className="flex-none">
              Close
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-line px-5 py-2.5">
            <LevelTile level={p.level} />
            <span className="text-[15px] font-bold">{LEVEL_NAME[p.level]}</span>
            <span className={`font-mono text-[12px] font-bold ${isActive(p) ? TONE_TEXT[status.tone] : "text-ink-3"}`}>{isActive(p) ? status.code : STAGE_LABEL[p.stage].toUpperCase()}</span>
            <span className="ml-auto font-mono text-[12px] text-ink-3 tnum">{p.seenAt === null ? `waiting ${dur(waited)}` : `seen after ${dur(waited)}`}</span>
          </div>
          <nav aria-label="Jump to" className="scroll-x flex border-t border-line px-3">
            {JUMPS.map((j) => (
              <button key={j.id} type="button" onClick={() => jump(j.id)} className="h-10 px-2 text-[13px] font-bold whitespace-nowrap text-ink-3 hover:text-ink">
                {j.id === "sheet-care" && (
                  <span aria-hidden className="mr-1 text-pen">
                    ✦
                  </span>
                )}
                {j.label}
                {j.id === "sheet-care" && <span className="ml-1.5 font-mono text-[11px] font-normal">{open} open</span>}
              </button>
            ))}
          </nav>
        </header>

        <div id="sheet-overview" className="scroll-mt-44">
          <Section title="Why this priority">
            <div className={`lvl-${p.level} lvl-edge bg-raised py-3.5 pr-4 pl-5`}>
              <p className="text-[17px] leading-snug font-bold">{p.flags[0] ?? (count === 0 ? "No tests or treatments expected" : `Likely needs ${count} type${count === 1 ? "" : "s"} of test or treatment`)}</p>
              {p.flags.length > 1 && (
                <ul className="mt-2 space-y-1 text-[14px] text-ink-2">
                  {p.flags.slice(1).map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              )}
              {p.flags.length === 0 && needs && <p className="mt-1.5 text-[14px] text-ink-2">{needs[0].toUpperCase() + needs.slice(1)}.</p>}
              {p.needs.highRisk && p.needs.reason && (
                <p className="mt-2.5 flex items-start gap-2 text-[14px] text-ink-2">
                  <AiMark className="mt-px">AI</AiMark>
                  <span>Why high risk: {p.needs.reason}</span>
                </p>
              )}
              <p className="mt-2.5 text-[12px] text-ink-3">{rule(p.level)}</p>
            </div>
          </Section>

          <Section title="Vital signs" aside={recorded.some((v) => v.alarm) ? <Badge tone="alert">Check the red values</Badge> : undefined}>
            {recorded.length ? (
              <div className="grid grid-cols-2 border-t border-l border-line sm:grid-cols-3">
                {recorded.map((v) => (
                  <div key={v.label} className={`min-w-0 border-r border-b border-line px-3.5 py-3 ${v.alarm ? "shadow-[inset_3px_0_0_var(--alert)]" : ""}`}>
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-[12px] text-ink-2">{v.label}</span>
                      <span className={`font-mono text-[10px] font-bold ${v.color}`}>{v.code}</span>
                    </div>
                    <div className={`mt-1 font-mono text-[28px] leading-none font-bold tnum ${v.alarm ? "text-alert" : v.color}`}>{v.value}</div>
                    <div className="mt-1.5 truncate text-[12px] text-ink-3">
                      {v.unit}
                      {v.alarm && <b className="text-alert"> · check</b>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[14px] text-ink-3">No vital signs were in the note.</p>
            )}
            {missing.length > 0 && recorded.length > 0 && <p className="mt-2.5 text-[12px] text-ink-3">Not in the note: {missing.join(", ")}.</p>}
          </Section>

          <Section title="Care team and location">
            <Facts>
              <Fact label="Location">{place(dept, p)}</Fact>
              <Fact label="Doctor">{doctor ? `${doctor.name} · ${SPECIALTY_LABEL[doctor.specialty].toLowerCase()}` : <span className="text-warn">Not yet assigned</span>}</Fact>
              <Fact label="Nurse">{staffName(dept, p.nurseId) ?? "Not yet assigned"}</Fact>
              <Fact label="Arrived">
                <span className="font-mono tnum">{at(p.arrivedAt)}</span>
              </Fact>
              <Fact label="First doctor">
                {p.seenAt === null ? (
                  <span className={dept.now > due ? "text-alert" : ""}>
                    Due by <span className="font-mono tnum">{at(due)}</span> ({TARGET_MINUTES[p.level] ? `within ${TARGET_MINUTES[p.level]} minutes` : "at once"} for level {p.level})
                  </span>
                ) : (
                  <span className={p.seenAt > due ? "text-alert" : ""}>
                    Seen at <span className="font-mono tnum">{at(p.seenAt)}</span>, after {dur(waited)}
                    {p.seenAt > due ? ", later than the target" : ""}
                  </span>
                )}
              </Fact>
            </Facts>
          </Section>
        </div>

        <div id="sheet-care" className="scroll-mt-44">
          <Section title="Care plan · read from the chart">
            <CarePlanner key={p.id} patient={p} now={dept.now} onPlan={onPlan} onConfirm={onConfirm} />
          </Section>

          <Section title="Scheduled care" aside={<span className="font-mono text-[12px] text-ink-3">{open} open</span>}>
            {mine.length ? (
              <ul className="-mx-5 border-t border-line">
                {mine.map((t) => (
                  <TaskRow key={t.id} t={t} now={dept.now} onDone={onDone} showPatient={false} />
                ))}
              </ul>
            ) : (
              <p className="text-[14px] text-ink-3">No tasks yet. A doctor confirming the care plan schedules them.</p>
            )}
          </Section>
        </div>

        <div id="sheet-note" className="scroll-mt-44">
          <Section title="The nurse's note">
            {p.note ? (
              <p dir="auto" className="hand border border-line bg-raised px-4 py-3 text-[22px] leading-snug">
                {p.note}
              </p>
            ) : (
              <p className="text-[14px] text-ink-3">No note was recorded for this patient.</p>
            )}
          </Section>

          <Section
            title="What the AI read"
            aside={
              <span className="flex flex-wrap items-center gap-2">
                {p.review.length > 0 && <Badge tone="warn">Check: {p.review.join(", ")}</Badge>}
                <AiMark />
              </span>
            }
          >
            <Facts>
              <Fact label="Specialty">{SPECIALTY_LABEL[p.needs.specialty]}</Fact>
              <Fact label="Likely needs">{needs || "nothing beyond an examination"}</Fact>
              <Fact label="Likely to go">{DESTINATION_LABEL[p.needs.destination]}</Fact>
              <Fact label="High risk">{p.needs.highRisk ? "Yes, priority raised" : "No"}</Fact>
            </Facts>
            {p.needs.reason && !p.needs.highRisk && <p className="mt-3 text-[13px] leading-relaxed text-ink-2">{p.needs.reason}</p>}
            <p className="mt-3 text-[12px] text-ink-3">Predicted needs, not a diagnosis. Our rules set the level from these and the vital signs.</p>
          </Section>

          {p.source && (
            <Section title="Real visit · what actually happened">
              <p className="text-[14px] text-ink-2">
                Anonymised visit {p.source.row} from {p.source.dataset}. Expert triage: <b className="text-ink">L{p.source.expertLevel}</b> · triage nurse: <b className="text-ink">L{p.source.nurseLevel}</b> · ours: <b className="text-ink">L{p.level}</b> · outcome: {p.source.outcome}.
              </p>
            </Section>
          )}
        </div>

        <div className="flex-1" />
        {position && (
          <footer className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-line-strong bg-bg px-5 py-3">
            <Button size="sm" onClick={onPrev} disabled={!onPrev} aria-label="Previous patient" aria-keyshortcuts="ArrowLeft">
              ← Previous
            </Button>
            <span className="font-mono text-[12px] text-ink-3 tnum">Patient {position.replace("/", " of ")}</span>
            <Button size="sm" onClick={onNext} disabled={!onNext} aria-label="Next patient" aria-keyshortcuts="ArrowRight">
              Next →
            </Button>
          </footer>
        )}
      </div>
    </div>
  );
}
