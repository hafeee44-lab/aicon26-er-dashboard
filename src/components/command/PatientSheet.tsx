"use client";

import { useState, type ReactNode } from "react";
import { resourceCount } from "@/er/engine";
import type { CareResponse, Department, Patient, TaskView } from "@/er/types";
import { ageSex, at, bedLabel, DESTINATION_LABEL, dur, initials, STAGE_LABEL, staffName } from "./format";
import { CarePlanner } from "./CarePlanner";
import { TaskRow } from "./Tasks";
import { Badge, Button, Icon, LevelTile, useDialogFocus } from "./ui";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <section className="sheet-section"><h3>{title}</h3>{children}</section>;
}

function vitals(p: Patient) {
  const v = p.vitals;
  const adult = (p.age ?? 30) >= 8;
  return [
    { label: "Heart rate", value: v.hr, unit: "beats / minute", alarm: v.hr !== null && adult && v.hr > 100 },
    { label: "Blood pressure", value: v.sbp !== null ? `${v.sbp}/${v.dbp ?? "?"}` : null, unit: "mmHg", alarm: v.sbp !== null && v.sbp < 90 },
    { label: "Oxygen", value: v.spo2, unit: "% saturation", alarm: v.spo2 !== null && v.spo2 < 92 },
    { label: "Breathing rate", value: v.rr, unit: "breaths / minute", alarm: v.rr !== null && adult && v.rr > 20 },
    { label: "Temperature", value: v.temp, unit: "°C", alarm: v.temp !== null && v.temp >= 38 },
    { label: "Pain", value: v.pain, unit: "out of 10", alarm: v.pain !== null && v.pain >= 7 },
    { label: "Consciousness", value: v.consciousness, unit: "response", alarm: v.consciousness !== null && v.consciousness !== "alert" },
  ].filter((vital) => vital.value !== null);
}

export function PatientSheet({ dept, patient: p, tasks, onClose, onPlan, onConfirm, onDone, onPrev, onNext, position }: {
  dept: Department; patient: Patient; tasks: TaskView[]; onPrev?: () => void; onNext?: () => void; position?: string;
  onClose: () => void; onPlan: (draft: CareResponse["plan"]) => void; onConfirm: () => void; onDone: (t: TaskView) => void;
}) {
  const [tab, setTab] = useState<"summary" | "care" | "notes">("summary");
  const ref = useDialogFocus();
  const mine = tasks.filter((t) => t.patientId === p.id);
  const count = resourceCount(p.needs.resources);
  const waited = (p.seenAt ?? dept.now) - p.arrivedAt;
  const recorded = vitals(p);
  const explanation = p.flags[0] ?? `No danger signs recorded. ${count} type${count === 1 ? "" : "s"} of test or treatment expected.`;
  return <div ref={ref} className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="sheet-title">
    <button type="button" tabIndex={-1} className="modal-dismiss" onClick={onClose} aria-label="Close patient details" />
    <div className="patient-sheet thin-scroll">
      <header className="sheet-header"><span className="patient-avatar">{initials(p.name)}</span><div className="sheet-header-main"><h2 id="sheet-title">{p.name || "Unnamed patient"}</h2><p>{ageSex(p)} · {p.complaint}</p></div><Button size="sm" onClick={onClose} aria-label="Close patient (Escape)"><Icon name="close" size={18} /></Button></header>
      <div className="sheet-toolbar"><div className="flex flex-wrap gap-2 items-center"><LevelTile level={p.level} /><span className="muted">{STAGE_LABEL[p.stage]}</span></div><span className="muted tnum">{p.seenAt === null ? `${dur(waited)} waiting` : `Seen after ${dur(waited)}`}</span></div>
      <div className="sheet-nav" role="group" aria-label="Patient detail views">{([{ id: "summary", label: "Overview" }, { id: "care", label: `Care & tasks (${mine.filter((t) => t.status !== "done").length})` }, { id: "notes", label: "Original notes" }] as const).map((item) => <button type="button" key={item.id} aria-pressed={tab === item.id} onClick={() => setTab(item.id)}>{item.label}</button>)}</div>
      {tab === "summary" && <>
        <Section title="Why this priority"><div className="priority-explanation"><p>{explanation}</p><details><summary>See all priority rules</summary>{p.flags.length ? p.flags.map((f) => <span key={f} className="rule-chip">{f} → L{p.level}</span>) : <p>Emergency Severity Index rules assign level {p.level} using the expected tests and treatments: {p.needs.resources.join(", ").replaceAll("_", " ") || "examination only"}.</p>}</details></div></Section>
        <Section title="Recorded vital signs">{recorded.length ? <div className="vital-grid">{recorded.map((v) => <div key={v.label} className={`vital-card ${v.alarm ? "alarm" : ""}`}><span>{v.label}{v.alarm ? " · Check" : ""}</span><strong className={v.alarm ? "text-alert" : ""}>{v.value}</strong><span>{v.unit}</span></div>)}</div> : <p className="muted">No vital signs were recorded in the note.</p>}</Section>
        <Section title="Care team & location"><dl className="detail-list"><dt>Location</dt><dd>{bedLabel(dept, p) ? `Bed ${bedLabel(dept, p)}` : p.stage === "admitted" ? "Ward · bed not recorded" : "No bed assigned"}</dd><dt>Doctor</dt><dd>{staffName(dept, p.doctorId) ?? "Not yet assigned"}</dd><dt>Nurse</dt><dd>{staffName(dept, p.nurseId) ?? "Not yet assigned"}</dd><dt>Arrival</dt><dd className="tnum">{at(p.arrivedAt)}</dd></dl><Button variant="solid" className="mt-5 w-full" onClick={() => setTab("care")}>Open care plan & tasks <Icon name="arrow" size={17} /></Button></Section>
      </>}
      {tab === "care" && <>
        <Section title="Care plan"><CarePlanner key={p.id} patient={p} now={dept.now} onPlan={onPlan} onConfirm={onConfirm} /></Section>
        <Section title="Scheduled care">{mine.length ? <ul className="-mx-6">{mine.map((t) => <TaskRow key={t.id} t={t} now={dept.now} onDone={onDone} showPatient={false} />)}</ul> : <p className="muted">No care tasks yet. Confirm a care plan to schedule them.</p>}</Section>
      </>}
      {tab === "notes" && <>
        <Section title="The nurse’s original note">{p.note ? <p className="note-quote" dir="auto">{p.note}</p> : <p className="muted">An original note was not recorded for this patient.</p>}</Section>
        <Section title="What the note tells us">{p.review.length > 0 && <div className="mb-4"><Badge tone="warn">Needs review: {p.review.join(", ")}</Badge><p className="muted mt-2">These fields were uncertain. Check the original note.</p></div>}<dl className="detail-list"><dt>Specialty</dt><dd className="capitalize">{p.needs.specialty}</dd><dt>Expected needs</dt><dd>{p.needs.resources.join(", ").replaceAll("_", " ") || "Examination only"}</dd><dt>Likely destination</dt><dd>{DESTINATION_LABEL[p.needs.destination]}</dd><dt>High risk</dt><dd>{p.needs.highRisk ? "Yes · priority raised" : "No high-risk flag"}</dd></dl>{p.needs.reason && <p className="mt-4 text-[14px] text-ink-2">{p.needs.reason}</p>}</Section>
        {p.source && <Section title="Anonymised visit · recorded outcome"><p className="text-[14px] text-ink-2">Visit {p.source.row} from {p.source.dataset}. Expert level: L{p.source.expertLevel}. Nurse level: L{p.source.nurseLevel}. Our level: L{p.level}. Recorded outcome: {p.source.outcome}.</p></Section>}
      </>}
      {position && <div className="sheet-toolbar"><Button onClick={onPrev} disabled={!onPrev} aria-label="Previous patient">← Previous</Button><span className="muted">Patient {position}</span><Button onClick={onNext} disabled={!onNext} aria-label="Next patient">Next →</Button></div>}
    </div>
  </div>;
}
