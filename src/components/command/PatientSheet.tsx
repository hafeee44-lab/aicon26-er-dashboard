"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { resourceCount } from "@/er/engine";
import type { CareResponse, Department, Patient, TaskView } from "@/er/types";
import { ageSex, at, bedLabel, DESTINATION_LABEL, dur, shortStaff, STAGE_LABEL, staffName } from "./format";
import { CarePlanner } from "./CarePlanner";
import { TaskRow } from "./Tasks";
import { Badge, Button, LevelTile, Micro } from "./ui";

type Numeric = { label: string; value: string; unit: string; color: string; alarm: boolean };

function numerics(p: Patient): Numeric[] {
  const v = p.vitals;
  const adult = (p.age ?? 30) >= 8;
  return [
    { label: "HR", value: v.hr?.toString() ?? "—", unit: "bpm", color: "text-hr", alarm: v.hr !== null && adult && v.hr > 100 },
    { label: "NIBP", value: v.sbp !== null ? `${v.sbp}/${v.dbp ?? "—"}` : "—", unit: "mmHg", color: "text-bp", alarm: v.sbp !== null && v.sbp < 90 },
    { label: "SpO₂", value: v.spo2?.toString() ?? "—", unit: "%", color: "text-spo2", alarm: v.spo2 !== null && v.spo2 < 92 },
    { label: "RR", value: v.rr?.toString() ?? "—", unit: "/min", color: "text-rr", alarm: v.rr !== null && adult && v.rr > 20 },
    { label: "Temp", value: v.temp?.toString() ?? "—", unit: "°C", color: "text-temp", alarm: v.temp !== null && v.temp >= 38 },
    { label: "Pain", value: v.pain?.toString() ?? "—", unit: "/10", color: "text-ink", alarm: v.pain !== null && v.pain >= 7 },
    { label: "AVPU", value: v.consciousness ? v.consciousness[0].toUpperCase() : "—", unit: v.consciousness ?? "", color: "text-ink", alarm: v.consciousness !== null && v.consciousness !== "alert" },
  ];
}

function Section({ title, children, aside }: { title: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="border-b border-line px-5 py-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="micro">{title}</h3>
        {aside}
      </div>
      {children}
    </section>
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
}: {
  dept: Department;
  patient: Patient;
  tasks: TaskView[];
  onClose: () => void;
  onPlan: (draft: CareResponse["plan"]) => void;
  onConfirm: () => void;
  onDone: (t: TaskView) => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const p = patient;
  const mine = tasks.filter((t) => t.patientId === p.id);
  const count = resourceCount(p.needs.resources);
  const waited = (p.seenAt ?? dept.now) - p.arrivedAt;

  useEffect(() => {
    closeRef.current?.focus();
  }, [p.id]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-labelledby="sheet-title">
      <button type="button" aria-label="Close patient" className="absolute inset-0 bg-black/55" onClick={onClose} />
      <div className="thin-scroll relative h-full w-full max-w-[600px] overflow-y-auto border-l border-line-strong bg-bg">
        <header className="sticky top-0 z-10 flex items-start gap-4 border-b border-line bg-bg px-5 py-4">
          <LevelTile level={p.level} size="lg" />
          <div className="min-w-0 flex-1">
            <h2 id="sheet-title" className="truncate text-[24px] leading-tight font-bold">
              {p.name || "Unnamed patient"}
            </h2>
            <p className="mt-0.5 text-[14px] text-ink-2">
              <span className="font-mono">{ageSex(p)}</span> · {p.complaint}
            </p>
            <p className="mt-1 font-mono text-[12px] text-ink-3">
              {STAGE_LABEL[p.stage]} · in {at(p.arrivedAt)} · {p.seenAt === null ? `waiting ${dur(waited)}` : `seen after ${dur(waited)}`}
            </p>
          </div>
          <Button ref={closeRef} size="sm" onClick={onClose} aria-keyshortcuts="Escape">
            Close
          </Button>
        </header>

        <Section title={`Why level ${p.level}`}>
          {p.flags.length ? (
            <ul className="space-y-1.5">
              {p.flags.map((f) => (
                <li key={f} className="flex gap-2.5 text-[14px]">
                  <span className={`mt-1.5 size-2 flex-none lvl-${p.level}`} style={{ background: "var(--lvl)" }} aria-hidden />
                  {f}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[14px] text-ink-2">
              No danger signs. Level {p.level} because the team will likely need {count === 0 ? "no tests or treatments" : `${count} type${count > 1 ? "s" : ""} of test or treatment`} ({p.needs.resources.join(", ") || "none"}), following the ESI rules.
            </p>
          )}
        </Section>

        <section aria-label="Vital signs" className="grid grid-cols-4 gap-px border-b border-line bg-line sm:grid-cols-8">
          {numerics(p).map((n) => (
            <div key={n.label} className={`bg-bg px-3 py-3 ${n.label === "NIBP" ? "col-span-2" : ""}`}>
              <div className={`font-mono text-[11px] font-bold ${n.color}`}>{n.label}</div>
              <div className={`mt-1 font-mono text-[24px] leading-none font-bold tnum ${n.alarm ? "text-alert" : n.color}`}>{n.value}</div>
              <div className="mt-1 truncate font-mono text-[10px] text-ink-3">{n.unit}</div>
            </div>
          ))}
        </section>

        <Section title="What the AI read" aside={p.review.length ? <Badge tone="warn">Check: {p.review.join(", ")}</Badge> : undefined}>
          <dl className="grid grid-cols-[110px_minmax(0,1fr)] gap-y-1.5 text-[14px]">
            <dt className="text-ink-3">Specialty</dt>
            <dd className="capitalize">{p.needs.specialty}</dd>
            <dt className="text-ink-3">Likely needs</dt>
            <dd>{p.needs.resources.length ? p.needs.resources.join(", ").replaceAll("_", " ") : "nothing beyond an examination"}</dd>
            <dt className="text-ink-3">Likely to go</dt>
            <dd>{DESTINATION_LABEL[p.needs.destination]}</dd>
            <dt className="text-ink-3">High risk</dt>
            <dd>{p.needs.highRisk ? "Yes, raised priority" : "No"}</dd>
          </dl>
          {p.needs.reason && <p className="mt-3 text-[13px] leading-relaxed text-ink-2">{p.needs.reason}</p>}
          {p.note && (
            <p className="mt-3 border-l-2 border-line-strong pl-3 text-[13px] text-ink-3">
              Nurse note: <span className="hand text-[19px] leading-tight">{p.note}</span>
            </p>
          )}
        </Section>

        {p.source && (
          <Section title="Real visit · what actually happened">
            <p className="text-[14px] text-ink-2">
              Anonymised visit {p.source.row} from {p.source.dataset}. Expert triage: <b className="text-ink">L{p.source.expertLevel}</b> · triage nurse: <b className="text-ink">L{p.source.nurseLevel}</b> · ours: <b className="text-ink">L{p.level}</b> · outcome: {p.source.outcome}.
            </p>
          </Section>
        )}

        <Section title="People and place">
          <dl className="grid grid-cols-[110px_minmax(0,1fr)] gap-y-1.5 text-[14px]">
            <dt className="text-ink-3">Bed</dt>
            <dd className="font-mono">{bedLabel(dept, p) ?? (p.stage === "admitted" ? "Ward" : "—")}</dd>
            <dt className="text-ink-3">Doctor</dt>
            <dd>{staffName(dept, p.doctorId) ?? "Not yet assigned"}</dd>
            <dt className="text-ink-3">Nurse</dt>
            <dd>{shortStaff(staffName(dept, p.nurseId))}</dd>
          </dl>
        </Section>

        <Section title="Care plan · read from the chart">
          <CarePlanner key={p.id} patient={p} now={dept.now} onPlan={onPlan} onConfirm={onConfirm} />
        </Section>

        <Section title={`Tasks · ${mine.filter((t) => t.status !== "done").length} open`}>
          {mine.length ? (
            <ul className="-mx-5 border-t border-line">
              {mine.map((t) => (
                <TaskRow key={t.id} t={t} now={dept.now} onDone={onDone} showPatient={false} />
              ))}
            </ul>
          ) : (
            <Micro>No tasks yet</Micro>
          )}
        </Section>
      </div>
    </div>
  );
}
