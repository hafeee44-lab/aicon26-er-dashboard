import { TARGET_MINUTES } from "@/er/engine";
import type { Department, Patient } from "@/er/types";
import { ageSex, bedLabel, dur, onCorridor, shortStaff, staffName, STAGE_LABEL } from "./format";
import { LevelTile, SectionHead } from "./ui";

function Row({ d, p, onOpen }: { d: Department; p: Patient; onOpen: (id: string) => void }) {
  const remaining = p.arrivedAt + TARGET_MINUTES[p.level] - d.now;
  const waiting = p.stage === "waiting";
  const time = waiting ? remaining < 0 ? `${dur(-remaining)} overdue` : remaining === 0 ? "Due now" : `${dur(remaining)} left` : `Seen after ${dur((p.seenAt ?? d.now) - p.arrivedAt)}`;
  return <li><button type="button" onClick={() => onOpen(p.id)} className="queue-patient" aria-label={`${p.name || "Unnamed patient"}, level ${p.level}, ${p.complaint}, ${STAGE_LABEL[p.stage]}, ${time}. Open patient details.`}>
    <LevelTile level={p.level} />
    <span className="queue-name"><strong>{p.name || "Unnamed patient"}</strong><small>{ageSex(p)}</small><span className="mobile-complaint">{p.complaint}</span></span>
    <span className="queue-complaint">{p.complaint}</span>
    <span className="queue-status">{STAGE_LABEL[p.stage]}{onCorridor(p) && <small>No bed</small>}</span>
    <span className={`queue-time font-mono tnum ${waiting && remaining <= 0 ? "text-alert" : ""}`}>{time}</span>
    <span className="queue-location">{staffName(d, p.doctorId) ? shortStaff(staffName(d, p.doctorId)) : "Doctor not yet assigned"} · {bedLabel(d, p) ? `Bed ${bedLabel(d, p)}` : onCorridor(p) ? "Corridor (no bed)" : "Bed not yet assigned"}<span>Open details →</span></span>
  </button></li>;
}

function Group({ title, patients, d, onOpen, collapsed = false }: { title: string; patients: Patient[]; d: Department; onOpen: (id: string) => void; collapsed?: boolean }) {
  if (!patients.length) return null;
  const heading = <span className="queue-group-title">{title}<span className="font-mono tnum">{patients.length}</span></span>;
  if (collapsed) return <li className="queue-group"><details className="queue-more"><summary>{heading}<span>View patients</span></summary><ul>{patients.map((p) => <Row key={p.id} d={d} p={p} onOpen={onOpen} />)}</ul></details></li>;
  return <li className="queue-group"><div className="queue-group-heading">{heading}</div><ul>{patients.slice(0, 3).map((p) => <Row key={p.id} d={d} p={p} onOpen={onOpen} />)}{patients.length > 3 && <li><details className="queue-more"><summary>Show {patients.length - 3} more waiting patients <span>⌄</span></summary><ul>{patients.slice(3).map((p) => <Row key={p.id} d={d} p={p} onOpen={onOpen} />)}</ul></details></li>}</ul></li>;
}

export function DoorBoard({ dept, onOpen }: { dept: Department; onOpen: (id: string) => void }) {
  const due = (p: Patient) => p.arrivedAt + TARGET_MINUTES[p.level];
  const waiting = dept.patients.filter((p) => p.stage === "waiting").sort((a, b) => due(a) - due(b) || a.level - b.level);
  const treating = dept.patients.filter((p) => p.stage === "with_doctor" || p.stage === "awaiting_results" || p.stage === "awaiting_bed").sort((a, b) => a.level - b.level || a.arrivedAt - b.arrivedAt);
  return <section aria-label="Patient queue" className="command-card queue-card"><SectionHead title="Patient queue" aside={<span className="queue-hint">Select a patient for the full picture</span>} /><div className="queue-scroll thin-scroll"><div className="queue-columns" aria-hidden>{["Level", "Patient", "Complaint", "Status", "Time left / overdue"].map((label) => <span key={label}>{label}</span>)}</div><ul><Group title="Waiting at the door" patients={waiting} d={dept} onOpen={onOpen} />{!waiting.length && <li className="friendly-empty"><strong>No one waiting</strong><p>New arrivals will appear here. Treatment continues below.</p></li>}<Group title="In treatment" patients={treating} d={dept} onOpen={onOpen} collapsed /></ul></div><p className="queue-footnote">Time left follows the target for each patient’s level.</p></section>;
}
