"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { resourceCount } from "@/er/engine";
import type { CareResponse, Department, Patient, TaskView } from "@/er/types";
import { ageSex, at, bedLabel, DESTINATION_LABEL, dur, shortStaff, STAGE_LABEL, staffName } from "./format";
import { CarePlanner } from "./CarePlanner";
import { TaskRow } from "./Tasks";
import { Badge, Button, LevelTile } from "./ui";

type Numeric = { label: string; value: string; unit: string; alarm: boolean };
function numerics(p: Patient): Numeric[] {
  const v = p.vitals;
  const adult = (p.age ?? 30) >= 8;
  return [
    { label: "Heart rate", value: v.hr?.toString() ?? "", unit: "bpm", alarm: v.hr !== null && adult && v.hr > 100 },
    { label: "Blood pressure", value: v.sbp !== null ? `${v.sbp}${v.dbp !== null ? `/${v.dbp}` : ""}` : "", unit: "mmHg", alarm: v.sbp !== null && v.sbp < 90 },
    { label: "Oxygen", value: v.spo2?.toString() ?? "", unit: "%", alarm: v.spo2 !== null && v.spo2 < 92 },
    { label: "Breathing rate", value: v.rr?.toString() ?? "", unit: "per minute", alarm: v.rr !== null && adult && v.rr > 20 },
    { label: "Temperature", value: v.temp?.toString() ?? "", unit: "°C", alarm: v.temp !== null && v.temp >= 38 },
    { label: "Pain", value: v.pain?.toString() ?? "", unit: "out of 10", alarm: v.pain !== null && v.pain >= 7 },
  ].filter((n) => n.value !== "");
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <section className="patient-section"><h3>{title}</h3>{children}</section>;
}

export function PatientSheet({ dept, patient, tasks, onClose, onPlan, onConfirm, onDone }: { dept: Department; patient: Patient; tasks: TaskView[]; onClose: () => void; onPlan: (draft: CareResponse["plan"]) => void; onConfirm: () => void; onDone: (t: TaskView) => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const p = patient;
  const mine = tasks.filter((t) => t.patientId === p.id);
  const count = resourceCount(p.needs.resources);
  const waited = (p.seenAt ?? dept.now) - p.arrivedAt;
  const vitals = numerics(p);
  useEffect(() => { closeRef.current?.focus(); }, [p.id]);
  return <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-labelledby="sheet-title"><button type="button" aria-label="Close patient" className="absolute inset-0 bg-black/55" onClick={onClose} /><div className="patient-sheet thin-scroll">
    <header className="patient-sheet-header"><LevelTile level={p.level} size="lg" /><div><h2 id="sheet-title">{p.name || "Unnamed patient"}</h2><p>{ageSex(p)} · {p.complaint}</p><p>{STAGE_LABEL[p.stage]} · {p.seenAt === null ? "Waiting" : "Seen after"} <span className="font-mono tnum">{dur(waited)}</span></p></div><Button ref={closeRef} onClick={onClose} aria-label="Close patient details" aria-keyshortcuts="Escape">Close</Button></header>
    <Section title="Why this level">{p.flags.length ? <><p className="priority-explanation">{p.flags.slice(0, 2).join(". ")}</p>{p.flags.length > 2 && <details className="calm-details"><summary>See all reasons</summary><ul className="rule-explanation">{p.flags.slice(2).map((flag) => <li key={flag}>{flag}</li>)}</ul></details>}</> : <p className="priority-explanation">No danger signs. Level {p.level} reflects {count === 0 ? "an examination without extra tests or treatments" : `${count} type${count > 1 ? "s" : ""} of test or treatment`}.</p>}</Section>
    <Section title="Recorded vital signs">{vitals.length || p.vitals.consciousness ? <div className="patient-vitals">{vitals.map((n) => <div key={n.label}><span>{n.label}</span><strong className={`font-mono tnum ${n.alarm ? "text-alert" : ""}`}>{n.value}<small>{n.unit}</small></strong>{n.alarm && <small className="text-alert">Needs review</small>}</div>)}{p.vitals.consciousness && <div><span>Response</span><strong className={p.vitals.consciousness === "alert" ? "response-value" : "response-value text-alert"}>{p.vitals.consciousness}</strong></div>}</div> : <p>No vital signs recorded. Check the nurse’s note below.</p>}</Section>
    <Section title="Care plan"><CarePlanner key={p.id} patient={p} now={dept.now} onPlan={onPlan} onConfirm={onConfirm} /></Section>
    <Section title={`Tasks · ${mine.filter((t) => t.status !== "done").length} open`}>{mine.length ? <ul className="patient-task-list">{mine.map((t) => <TaskRow key={t.id} t={t} now={dept.now} onDone={onDone} showPatient={false} />)}</ul> : <p>No tasks yet. Confirm a care plan to begin reminders.</p>}</Section>
    <details className="patient-accordion calm-details"><summary>What the AI read {p.review.length > 0 && <Badge tone="warn">Check fields</Badge>}</summary><div><dl className="patient-facts"><dt>Specialty</dt><dd className="capitalize">{p.needs.specialty}</dd><dt>Likely needs</dt><dd>{p.needs.resources.length ? p.needs.resources.join(", ").replaceAll("_", " ") : "Examination only"}</dd><dt>Likely destination</dt><dd>{DESTINATION_LABEL[p.needs.destination]}</dd><dt>High risk</dt><dd>{p.needs.highRisk ? "Yes, priority raised" : "No"}</dd></dl>{p.review.length > 0 && <p className="text-alert">Please check: {p.review.join(", ")}</p>}{p.needs.reason && <p>{p.needs.reason}</p>}{p.note && <blockquote><span>Nurse note</span><p>{p.note}</p></blockquote>}</div></details>
    <details className="patient-accordion calm-details"><summary>People and place</summary><div><dl className="patient-facts"><dt>Bed</dt><dd>{bedLabel(dept, p) ?? (p.stage === "admitted" ? "Ward (no bed)" : "Not yet assigned")}</dd><dt>Doctor</dt><dd>{staffName(dept, p.doctorId) ?? "Not yet assigned"}</dd><dt>Nurse</dt><dd>{p.nurseId ? shortStaff(staffName(dept, p.nurseId)) : "Not yet assigned"}</dd><dt>Arrived</dt><dd className="font-mono tnum">{at(p.arrivedAt)}</dd></dl></div></details>
    {p.source && <details className="patient-accordion calm-details"><summary>Original anonymised visit</summary><div><p>Visit {p.source.row}, {p.source.dataset}. Expert level {p.source.expertLevel}; nurse level {p.source.nurseLevel}; our level {p.level}. Outcome: {p.source.outcome}.</p></div></details>}
  </div></div>;
}
