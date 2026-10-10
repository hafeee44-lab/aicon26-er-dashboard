"use client";

import { useState } from "react";
import { TARGET_MINUTES } from "@/er/engine";
import type { Department, Patient } from "@/er/types";
import { ageSex, bedLabel, dur, initials, onCorridor, shortStaff, staffName, STAGE_LABEL } from "./format";
import { Icon, LevelBadge } from "./ui";

function Row({ d, p, onOpen }: { d: Department; p: Patient; onOpen: (id: string) => void }) {
  const waiting = p.stage === "waiting";
  const elapsed = (p.seenAt ?? d.now) - p.arrivedAt;
  const remaining = TARGET_MINUTES[p.level] - elapsed;
  const late = waiting && remaining < 0;
  const time = waiting ? remaining < 0 ? `${dur(-remaining)} overdue` : remaining === 0 ? "Due now" : `${dur(remaining)} left` : `Seen in ${dur(elapsed)}`;
  return <li><button type="button" onClick={() => onOpen(p.id)} className={`queue-patient ${late ? "patient-overdue" : ""}`} aria-label={`${p.name || "Unnamed patient"}, level ${p.level}, ${p.complaint}, ${time}. Open details.`}>
    <span className="queue-identity"><span className="patient-avatar">{initials(p.name) || "?"}</span><span className="queue-name"><strong>{p.name || "Unnamed patient"}</strong><small>{ageSex(p)}<span className="mobile-complaint"> · {p.complaint}</span></small></span></span>
    <span className="queue-complaint">{p.complaint}</span>
    <LevelBadge level={p.level} />
    <span className="queue-time"><strong className={`font-mono tnum ${late ? "text-alert" : ""}`}>{time}</strong><small>{waiting ? `${dur(elapsed)} waiting` : STAGE_LABEL[p.stage]}</small></span>
    <Icon name="chevron" size={16} className="row-chevron" />
    <span className="queue-location">{staffName(d, p.doctorId) ? shortStaff(staffName(d, p.doctorId)) : "Doctor not yet assigned"} · {bedLabel(d, p) ? `Bed ${bedLabel(d, p)}` : onCorridor(p) ? "Corridor (no bed)" : "Bed not yet assigned"}</span>
  </button></li>;
}

export function DoorBoard({ dept, onOpen }: { dept: Department; onOpen: (id: string) => void }) {
  const [filter, setFilter] = useState<"waiting" | "treatment" | "all">("waiting");
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(false);
  const due = (p: Patient) => p.arrivedAt + TARGET_MINUTES[p.level];
  const waiting = dept.patients.filter((p) => p.stage === "waiting").sort((a, b) => due(a) - due(b) || a.level - b.level);
  const treating = dept.patients.filter((p) => p.stage === "with_doctor" || p.stage === "awaiting_results" || p.stage === "awaiting_bed").sort((a, b) => a.level - b.level || a.arrivedAt - b.arrivedAt);
  const all = filter === "waiting" ? waiting : filter === "treatment" ? treating : [...waiting, ...treating];
  const patients = all.filter((p) => `${p.name} ${p.complaint}`.toLowerCase().includes(query.toLowerCase()));
  const shown = expanded || query ? patients : patients.slice(0, 5);
  return <section aria-labelledby="queue-title" className="command-card queue-card">
    <div className="queue-heading"><div><h2 id="queue-title">Patient queue <span className="count-chip">{waiting.length + treating.length}</span></h2><p>A clear next step for every patient.</p></div><label className="queue-search"><Icon name="search" size={17} /><input id="patient-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find a patient" aria-label="Search patients by name or complaint" /></label></div>
    <div className="queue-tabs" role="group" aria-label="Patient group">{([{ id: "waiting", label: "Waiting", count: waiting.length }, { id: "treatment", label: "In treatment", count: treating.length }, { id: "all", label: "All patients", count: waiting.length + treating.length }] as const).map((f) => <button type="button" key={f.id} aria-pressed={filter === f.id} onClick={() => { setFilter(f.id); setExpanded(false); }}>{f.label}<span>{f.count}</span></button>)}</div>
    <div className="queue-scroll thin-scroll"><div className="queue-columns" aria-hidden><span>Patient</span><span>Reason for visit</span><span>Priority</span><span>Time to care</span><span /></div><ul>{shown.map((p) => <Row key={p.id} d={dept} p={p} onOpen={onOpen} />)}</ul>{!patients.length && <div className="friendly-empty"><Icon name={query ? "search" : "check"} size={28} /><strong>{query ? "No matching patients" : filter === "waiting" ? "No one is waiting" : "No patients here right now"}</strong><p>{query ? "Try another name or complaint." : "New arrivals and care updates appear here."}</p>{query && <button className="text-action" onClick={() => setQuery("")}>Clear search</button>}</div>}</div>
    <div className="queue-footer"><span>{query ? `${patients.length} results` : `${Math.min(shown.length, patients.length)} of ${patients.length} patients`} · Select a patient for details</span>{patients.length > 5 && !query && <button type="button" className="text-action" onClick={() => setExpanded(!expanded)}>{expanded ? "Show fewer" : "View all patients"}<Icon name="arrow" size={16} /></button>}</div>
  </section>;
}
