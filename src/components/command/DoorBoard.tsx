"use client";

import { useState } from "react";
import { TARGET_MINUTES, waitingQueue } from "@/er/engine";
import type { Department, Patient } from "@/er/types";
import { ageSex, at, bedLabel, doorStatus, dur, initials, onCorridor, shortStaff, staffName, TONE_TEXT } from "./format";
import { Button, Icon, LevelTile, SectionHead } from "./ui";

type Filter = "all" | "waiting" | "treating" | "boarding" | "corridor";
function groups(d: Department) {
  return {
    waiting: waitingQueue(d),
    treating: d.patients.filter((p) => p.stage === "with_doctor" || p.stage === "awaiting_results").sort((a, b) => a.level - b.level || a.arrivedAt - b.arrivedAt),
    boarding: d.patients.filter((p) => p.stage === "awaiting_bed").sort((a, b) => a.arrivedAt - b.arrivedAt),
  };
}
export function patientOrder(d: Department) {
  const g = groups(d);
  return [...g.waiting, ...g.treating, ...g.boarding, ...d.patients.filter((p) => p.stage === "admitted")].map((p) => p.id);
}

function PatientCard({ d, p, position, onOpen }: { d: Department; p: Patient; position?: number; onOpen: (id: string) => void }) {
  const status = doorStatus(d, p);
  const wait = (p.seenAt ?? d.now) - p.arrivedAt;
  const target = TARGET_MINUTES[p.level];
  const progress = Math.min(100, wait / Math.max(1, target) * 100);
  return <li><button type="button" className={`patient-card lvl-${p.level} ${position === 1 ? "next-patient" : ""}`} onClick={() => onOpen(p.id)} aria-label={`${p.name || "Unnamed patient"}, level ${p.level}, ${p.complaint}. ${status.code}. Open patient details.`}>
    <span className="patient-card-top"><span className="patient-avatar">{initials(p.name)}</span><span className="patient-identity"><strong>{p.name || "Unnamed patient"}</strong><small>{ageSex(p)} · Arrived {at(p.arrivedAt)}</small></span><Icon name="arrow" size={17} /></span>
    <span className="patient-complaint">{p.complaint || "Complaint not recorded"}</span>
    <span className="patient-labels"><LevelTile level={p.level} /><span className={`patient-stage ${TONE_TEXT[status.tone]}`}>{status.code}</span></span>
    <span className="patient-card-foot"><span>{position ? <b>{position === 1 ? "Next to be seen" : `Queue position ${position}`}</b> : <>{bedLabel(d, p) ? `Bed ${bedLabel(d, p)}` : onCorridor(p) ? "Corridor · no bed" : "Bed pending"}<span className="staff-separator"> · </span>{shortStaff(staffName(d, p.doctorId))}</>}</span><span className="tnum">{p.seenAt === null ? `${dur(wait)} waiting` : `Seen after ${dur(wait)}`}</span></span>
    {p.stage === "waiting" && <span className={`patient-wait-track ${wait > target ? "breached" : ""}`} aria-hidden="true"><span style={{ width: `${progress}%` }} /></span>}
  </button></li>;
}

export function DoorBoard({ dept, onOpen, onNew }: { dept: Department; onOpen: (id: string) => void; onNew?: () => void }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(false);
  const g = groups(dept);
  const corridor = dept.patients.filter(onCorridor);
  const total = g.waiting.length + g.treating.length + g.boarding.length;
  const matches = (p: Patient) => `${p.name} ${p.complaint}`.toLowerCase().includes(query.toLowerCase());
  const sections = filter === "corridor" ? [{ id: "corridor", title: "Corridor · no bed", patients: corridor }] : [
    { id: "waiting", title: "Waiting to be seen", patients: g.waiting },
    { id: "treating", title: "Care in progress", patients: g.treating },
    { id: "boarding", title: "Waiting for a ward bed", patients: g.boarding },
  ].filter((group) => filter === "all" || filter === group.id);
  const visible = sections.map((group) => ({ ...group, patients: group.patients.filter(matches) })).filter((group) => group.patients.length);
  const filters: { id: Filter; label: string; count: number }[] = [
    { id: "all", label: "All patients", count: total }, { id: "waiting", label: "Waiting", count: g.waiting.length },
    { id: "treating", label: "In care", count: g.treating.length }, { id: "boarding", label: "Ward bed", count: g.boarding.length }, { id: "corridor", label: "Corridor", count: corridor.length },
  ];
  return <section className="surface patients-panel" aria-label="Patient board">
    <SectionHead title="Patients at a glance" aside={<span className="muted">{total} in the department</span>} />
    <div className="patient-toolbar"><div className="filter-tabs" role="group" aria-label="Filter patients">{filters.map((f) => <button type="button" key={f.id} aria-pressed={filter === f.id} onClick={() => { setFilter(f.id); setExpanded(false); }}>{f.label}<span>{f.count}</span></button>)}</div><label className="search-field"><Icon name="search" size={17} /><input id="patient-search" type="search" placeholder="Find a patient…" aria-label="Search patients (/)" value={query} onChange={(e) => setQuery(e.target.value)} /><kbd>/</kbd></label></div>
    <div className="patient-groups">
      {visible.map((group) => <section key={group.id} className="patient-group"><div className="group-label"><h3>{group.title} <span>{group.patients.length}</span></h3>{group.id === "waiting" && <small>{dept.policy === "smart" ? "Sickest first, then longest wait" : "In arrival order"}</small>}</div><ul className="patient-card-grid">{(expanded || query ? group.patients : group.patients.slice(0, 6)).map((p) => <PatientCard key={p.id} d={dept} p={p} position={group.id === "waiting" ? g.waiting.findIndex((x) => x.id === p.id) + 1 : undefined} onOpen={onOpen} />)}</ul>{!expanded && !query && group.patients.length > 6 && <Button className="show-more-patients" onClick={() => setExpanded(true)}>Show {group.patients.length - 6} more patients <Icon name="arrow" size={16} /></Button>}</section>)}
      {!visible.length && <div className="empty-state"><span className="empty-symbol"><Icon name={query ? "search" : "check"} size={28} /></span><h3>{query ? "No matching patients" : filter === "waiting" ? "No one is waiting" : "No patients in this group"}</h3><p>{query ? "Try another name or complaint." : "Patients appear here as their care progresses."}</p><Button onClick={query ? () => setQuery("") : filter !== "all" ? () => setFilter("all") : onNew}>{query ? "Clear search" : filter !== "all" ? "See all patients" : "Add a new arrival"}</Button></div>}
    </div>
    <div className="board-note"><Icon name="check" size={16} /><span>Select any patient for their priority, notes and care plan.</span></div>
  </section>;
}
