"use client";

import { useState } from "react";
import { GRACE_MINUTES } from "@/er/engine";
import type { Department, TaskView } from "@/er/types";
import { at, dur, KIND_LABEL } from "./format";
import { Badge, Button, Icon, Seg } from "./ui";
import { TaskRow, taskCode } from "./Tasks";

function TaskCard({ tasks, now, onDone, onOpen }: { tasks: TaskView[]; now: number; onDone: (t: TaskView) => void; onOpen: (id: string) => void }) {
  const t = tasks[0];
  const grouped = tasks.length > 1;
  return <li className="rounds-task">
    <div className="rounds-task-top"><span className="muted">{KIND_LABEL[t.kind]}</span><span className={t.status === "overdue" ? "text-alert tnum" : "tnum"}>{taskCode(t, now)}</span></div>
    <h3>{grouped ? `${tasks.length} ${t.kind === "see_doctor" ? "first assessments" : t.title.toLowerCase()}` : t.title}</h3>
    {!grouped && <button type="button" className="patient-link" onClick={() => onOpen(t.patientId)}>{t.patientName} →</button>}
    <p><b className="tnum">{at(t.dueAt)}</b> · {t.ownerName}</p>
    {t.escalatedAt !== null && <Badge tone="alert">Escalated to the care team</Badge>}
    {grouped && <details><summary>See {tasks.length} patients</summary><ul>{tasks.map((task) => <li key={task.id} className="border-t border-line py-2"><button type="button" className="min-h-11 text-left underline underline-offset-4" onClick={() => onOpen(task.patientId)}>{task.patientName} →</button>{task.kind !== "see_doctor" && task.status !== "done" && <Button onClick={() => onDone(task)} aria-label={`Complete ${task.title} for ${task.patientName}`}>Mark done</Button>}</li>)}</ul></details>}
    <details><summary>Why this task?</summary><p>{t.source}</p>{t.kind === "see_doctor" && <p>Completed automatically when a doctor sees the patient.</p>}</details>
    {!grouped && t.kind !== "see_doctor" && t.status !== "done" && <Button onClick={() => onDone(t)} aria-label={`Complete ${t.title} for ${t.patientName}`}><Icon name="check" size={16} />Mark done</Button>}
  </li>;
}

function grouped(tasks: TaskView[]) {
  const map = new Map<string, TaskView[]>();
  for (const task of tasks) {
    const key = `${task.kind}|${task.title}|${task.ownerId}|${task.dueAt}|${task.status}|${task.escalatedAt}|${task.source}`;
    map.set(key, [...(map.get(key) ?? []), task]);
  }
  return [...map.values()];
}

export function Rounds({ dept, tasks, onDone, onOpen }: { dept: Department; tasks: TaskView[]; onDone: (t: TaskView) => void; onOpen: (id: string) => void }) {
  const [owner, setOwner] = useState("all");
  const [role, setRole] = useState<"all" | "nurse" | "doctor">("all");
  const filtered = tasks.filter((t) => (owner === "all" || t.ownerId === owner || (owner === "unassigned" && !t.ownerId)) && (role === "all" || t.role === role));
  const ordered = [...filtered].sort((a, b) => a.dueAt - b.dueAt);
  const lanes = [{ status: "overdue", title: "Needs attention", description: "Nothing overdue. Keep following scheduled care." }, { status: "due", title: "Due now", description: "No tasks due now. Upcoming care is on the right." }, { status: "upcoming", title: "Coming up", description: "No scheduled tasks. Add a care plan from a patient." }] as const;
  const completed = ordered.filter((t) => t.status === "done");
  return <>
    <div className="surface rounds-toolbar"><Seg label="Filter tasks by role" value={role} onChange={setRole} options={[{ value: "all", label: "Everyone" }, { value: "nurse", label: "Nursing care" }, { value: "doctor", label: "Doctor reviews" }]} /><label>Assigned to<select value={owner} onChange={(e) => setOwner(e.target.value)}><option value="all">All team members</option><option value="unassigned">Next available clinician</option>{[...dept.nurses, ...dept.doctors].map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label><span className="muted">{filtered.filter((t) => t.status !== "done").length} open tasks</span></div>
    <div className="rounds-columns">{lanes.map((lane) => { const own = ordered.filter((t) => t.status === lane.status); return <section key={lane.status} className="rounds-lane"><h2 className={lane.status === "overdue" && own.length ? "text-alert" : ""}><Icon name={lane.status === "overdue" ? "alert" : "clock"} size={18} />{lane.title}<span>{own.length}</span></h2>{own.length ? <ul>{grouped(own).map((group) => <TaskCard key={group[0].id} tasks={group} now={dept.now} onDone={onDone} onOpen={onOpen} />)}</ul> : <div className="empty-state"><Icon name="check" /><p>{lane.description}</p></div>}</section>; })}</div>
    <details className="surface mt-6"><summary className="min-h-14 p-5 font-semibold">Completed care · {completed.length}</summary>{completed.length ? <ul>{completed.map((t) => <TaskRow key={t.id} t={t} now={dept.now} onOpen={onOpen} />)}</ul> : <p className="empty-state">Completed tasks appear here after care is given.</p>}</details>
    <p className="surface rounds-explanation">A task becomes overdue after its grace window: {dur(GRACE_MINUTES.medication)} for medicines, drips and observations; {dur(GRACE_MINUTES.dressing)} for dressings, tests and reviews. Open “Why this task?” to see its original source. Mark done only after care is given.</p>
  </>;
}
