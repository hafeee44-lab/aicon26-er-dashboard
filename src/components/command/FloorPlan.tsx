import { isBusy, ZONES, waitingQueue } from "@/er/engine";
import type { Bed, Department, Patient, TaskView, Zone } from "@/er/types";
import { ageSex, doorStatus, initials, onCorridor, TONE_TEXT } from "./format";
import { Icon, LevelTile, SectionHead } from "./ui";
import { taskCode } from "./Tasks";

const ZONE_NAME: Record<Zone, string> = { resus: "Resuscitation", acute: "Acute care", fasttrack: "Fast track" };
const ZONE_DESCRIPTION: Record<Zone, string> = { resus: "Immediate, critical care", acute: "Assessment and treatment", fasttrack: "Minor illness and injury" };

function BedTile({ d, bed, onOpen }: { d: Department; bed: Bed; onOpen: (id: string) => void }) {
  const p = d.patients.find((x) => x.id === bed.patientId);
  if (!p) return <div className="bed-card bed-empty"><span><span>Bed {bed.label}</span><Icon name="bed" size={17} /></span><span><strong>Available</strong><small>Ready for a patient</small></span></div>;
  const status = doorStatus(d, p);
  return <button type="button" className={`bed-card lvl-${p.level}`} onClick={() => onOpen(p.id)} aria-label={`Bed ${bed.label}: ${p.name}, level ${p.level}, ${status.code}`}><span><span>Bed {bed.label}</span><LevelTile level={p.level} size="sm" /></span><span><strong>{p.name}</strong><small className={TONE_TEXT[status.tone]}>{status.code}</small></span></button>;
}

function MiniPatient({ d, p, onOpen }: { d: Department; p: Patient; onOpen: (id: string) => void }) {
  return <button type="button" className="mini-patient" onClick={() => onOpen(p.id)}><span className="patient-avatar">{initials(p.name)}</span><span><strong>{p.name}</strong><small><LevelTile level={p.level} size="sm" /> {doorStatus(d, p).code}</small></span></button>;
}

export function FloorPlan({ dept, tasks, onOpen }: { dept: Department; tasks: TaskView[]; onOpen: (id: string) => void }) {
  const corridor = dept.patients.filter(onCorridor);
  const waiting = waitingQueue(dept);
  const ward = dept.patients.filter((p) => p.stage === "admitted" || p.stage === "awaiting_bed");
  const open = (id: string) => tasks.filter((t) => t.patientId === id && t.status !== "done" && t.kind !== "see_doctor");
  return <div className="department-layout">
    <div className="zone-grid">{ZONES.map((zone) => {
      const beds = dept.beds.filter((b) => b.zone === zone);
      const free = beds.filter((b) => !b.patientId).length;
      return <section key={zone} className="surface zone-panel"><div className="zone-title"><div><h2>{ZONE_NAME[zone]}</h2><p>{ZONE_DESCRIPTION[zone]}</p></div><div className={`zone-number ${free === 0 ? "text-alert" : ""}`}>{free}<small>/{beds.length}<br />beds free</small></div></div><div className="zone-meter" role="img" aria-label={`${free} of ${beds.length} beds free`}>{beds.map((bed) => <span key={bed.id} className={bed.patientId ? "occupied" : ""} />)}</div><div className="bed-grid">{beds.map((bed) => <BedTile key={bed.id} d={dept} bed={bed} onOpen={onOpen} />)}</div></section>;
    })}</div>
    <div className="department-secondary">
      <section className="surface"><SectionHead title="Waiting room" aside={<span className="badge">{waiting.length} waiting</span>} />{waiting.length ? <div className="mini-patient-grid">{waiting.map((p) => <MiniPatient key={p.id} d={dept} p={p} onOpen={onOpen} />)}</div> : <p className="empty-state">No one waiting. New arrivals appear here.</p>}</section>
      <section className="surface"><SectionHead title="Corridor · no bed" aside={<span className={`badge ${corridor.length ? "text-alert" : ""}`}>{corridor.length} patients</span>} />{corridor.length ? <div className="mini-patient-grid">{corridor.map((p) => <MiniPatient key={p.id} d={dept} p={p} onOpen={onOpen} />)}</div> : <p className="empty-state">No corridor care. Every treated patient has a bed.</p>}</section>
    </div>
    <section className="surface"><SectionHead title="Continuing care on the ward" aside={<span className="muted">{ward.length} patients</span>} /><div className="ward-grid">{ward.map((p) => { const next = open(p.id); return <button type="button" className="ward-card" key={p.id} onClick={() => onOpen(p.id)}><LevelTile level={p.level} /><strong>{p.name} <span className="muted">· {ageSex(p)}</span></strong><p>{p.plan?.problems[0] ?? p.complaint}</p>{next[0] ? <><span className={`badge ${next[0].status === "overdue" ? "text-alert" : ""}`}>{taskCode(next[0], dept.now)}</span><p>{next[0].title}</p></> : <span className="muted">{p.plan ? "No open care tasks" : "Open patient to add a care plan"}</span>}</button>; })}</div>{!ward.length && <p className="empty-state">No ward patients. Admitted patients appear here.</p>}</section>
    <section className="surface"><SectionHead title="Your care team" aside={<span className="muted">{dept.doctors.filter((d) => d.onShift).length} doctors on shift · {dept.nurses.length} nurses</span>} /><div className="staff-grid">
      {dept.doctors.map((doc) => { const p = dept.patients.find((x) => x.doctorId === doc.id && x.stage === "with_doctor"); return <div key={doc.id} className={`staff-card ${!doc.onShift ? "off-shift" : ""}`}><div className="staff-card-top"><span className="staff-avatar">{initials(doc.name.replace(/^Dr\.?\s+/, ""))}</span><div><strong>{doc.name}</strong><small className="capitalize">{doc.specialty}</small></div></div><span className={`badge ${!doc.onShift ? "" : isBusy(dept, doc) ? "text-warn" : "text-ok"}`}>{!doc.onShift ? "Backup · off shift" : isBusy(dept, doc) ? "With a patient" : "Available"}</span>{p && <button type="button" className="text-left text-[13px] underline underline-offset-4" onClick={() => onOpen(p.id)}>{p.name} →</button>}</div>; })}
      {dept.nurses.map((n) => { const mine = tasks.filter((t) => t.ownerId === n.id && t.status !== "done"); const late = mine.filter((t) => t.status === "overdue").length; return <div key={n.id} className="staff-card"><div className="staff-card-top"><span className="staff-avatar">{initials(n.name.replace(/^Nurse\s+/, ""))}</span><div><strong>{n.name}</strong><small>Nurse · {mine.length} open tasks</small></div></div><span className={`badge ${late ? "text-alert" : "text-ok"}`}>{late ? `${late} overdue tasks` : "Care on schedule"}</span></div>; })}
    </div></section>
  </div>;
}
