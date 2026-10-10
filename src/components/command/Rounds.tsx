"use client";

import { useState } from "react";
import { GRACE_MINUTES } from "@/er/engine";
import type { Department, TaskView } from "@/er/types";
import { at, dur, FREQ_LABEL, KIND_LABEL, shortStaff } from "./format";
import { Button, Glyph, Micro, SectionHead } from "./ui";
import { TaskRow, taskCode } from "./Tasks";

const BACK = 120;
const AHEAD = 360;
const SPAN = BACK + AHEAD;
const SLOT_GAP = 14;

type Lane = { id: string; name: string; role: string; tasks: (TaskView & { slot: number })[]; slots: number };

function lanes(d: Department, tasks: TaskView[]): Lane[] {
  const start = d.now - BACK;
  const end = d.now + AHEAD;
  const visible = tasks.filter((t) => (t.status === "overdue" || (t.dueAt >= start && t.dueAt <= end)) && !(t.status === "done" && t.dueAt < start));

  const groups: { id: string; name: string; role: string }[] = [
    { id: "first", name: "Next free doctor", role: "First assessments" },
    ...d.nurses.map((n) => ({ id: n.id, name: n.name, role: "Nurse" })),
    ...d.doctors.filter((doc) => visible.some((t) => t.ownerId === doc.id)).map((doc) => ({ id: doc.id, name: doc.name, role: "Doctor" })),
  ];

  return groups.map((g) => {
    const own = visible.filter((t) => (g.id === "first" ? t.kind === "see_doctor" : t.ownerId === g.id)).sort((a, b) => a.dueAt - b.dueAt);
    const ends: number[] = [];
    const placed = own.map((t) => {
      const x = Math.max(t.dueAt, start);
      let slot = ends.findIndex((e) => x - e >= SLOT_GAP);
      if (slot === -1) slot = ends.length;
      ends[slot] = x;
      return { ...t, slot };
    });
    return { ...g, tasks: placed, slots: Math.max(1, ends.length) };
  });
}

function Timeline({ d, data, selected, onSelect }: { d: Department; data: Lane[]; selected: string | null; onSelect: (id: string) => void }) {
  const start = d.now - BACK;
  const pos = (m: number) => `${(Math.min(Math.max(m, start), start + SPAN) - start) / SPAN * 100}%`;
  const hours = Array.from({ length: 10 }, (_, i) => Math.ceil(start / 60) * 60 + i * 60).filter((h) => h <= start + SPAN);

  return (
    <div className="scroll-x">
      <div className="min-w-[680px] sm:min-w-[760px]">
        <div className="grid grid-cols-[124px_minmax(0,1fr)] sm:grid-cols-[200px_minmax(0,1fr)] border-b border-line">
          <div className="px-4 py-2">
            <Micro>Person</Micro>
          </div>
          <div className="relative h-8">
            {hours.map((h) => (
              <span key={h} className="absolute top-2 -translate-x-1/2 font-mono text-[11px] text-ink-3 tnum" style={{ left: pos(h) }}>
                {at(h)}
              </span>
            ))}
            <span className="absolute top-1 z-10 -translate-x-1/2 bg-ink px-1.5 py-0.5 font-mono text-[10px] font-bold text-inverse tnum" style={{ left: pos(d.now) }}>
              NOW {at(d.now)}
            </span>
          </div>
        </div>
        {data.map((lane) => {
          const overdue = lane.tasks.filter((t) => t.status === "overdue").length;
          const height = lane.slots * 18 + 14;
          return (
            <div key={lane.id} className="grid grid-cols-[124px_minmax(0,1fr)] sm:grid-cols-[200px_minmax(0,1fr)] border-b border-line">
              <div className="flex min-w-0 flex-col justify-center px-4 py-2">
                <span className="truncate text-[13px] font-bold">{lane.id === "first" ? lane.name : shortStaff(lane.name)}</span>
                <span className="text-[11px] text-ink-3">
                  {lane.role}
                  {overdue > 0 && <span className="ml-1.5 font-bold text-alert">{overdue} late</span>}
                </span>
              </div>
              <div className="relative" style={{ height }}>
                {hours.map((h) => (
                  <span key={h} className="absolute inset-y-0 w-px bg-line" style={{ left: pos(h) }} />
                ))}
                <span className="absolute inset-y-0 z-10 w-0.5 bg-ink" style={{ left: pos(d.now) }} aria-hidden />
                {lane.tasks.map((t) => {
                  const top = 7 + t.slot * 18;
                  return (
                    <span key={t.id}>
                      {t.status === "overdue" && (
                        <span className="absolute h-0.5 bg-alert/70" style={{ left: pos(t.dueAt), width: `${(d.now - Math.max(t.dueAt, start)) / SPAN * 100}%`, top: top + 5 }} aria-hidden />
                      )}
                      <button
                        type="button"
                        onClick={() => onSelect(t.id)}
                        aria-label={`${KIND_LABEL[t.kind]}: ${t.title} for ${t.patientName}, ${taskCode(t, d.now)}`}
                        className={`absolute z-20 grid size-[18px] -translate-x-1/2 place-items-center ${selected === t.id ? "outline-2 outline-ink" : ""}`}
                        style={{ left: pos(t.dueAt), top: top - 4 }}
                      >
                        <Glyph kind={t.kind} status={t.status} />
                      </button>
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Detail({ t, now, onDone, onOpen }: { t: TaskView; now: number; onDone: (t: TaskView) => void; onOpen: (id: string) => void }) {
  const fromNotes = t.source.startsWith("From the notes: ");
  return (
    <div className="p-4">
      <div className="flex items-center gap-2">
        <Glyph kind={t.kind} status={t.status} />
        <Micro>{KIND_LABEL[t.kind]}</Micro>
      </div>
      <h3 className="mt-2 text-[20px] leading-tight font-bold">{t.title}</h3>
      <dl className="mt-3 grid grid-cols-[90px_minmax(0,1fr)] gap-y-1.5 text-[13px]">
        <dt className="text-ink-3">Patient</dt>
        <dd>
          <button type="button" className="font-bold underline decoration-line underline-offset-2" onClick={() => onOpen(t.patientId)}>
            {t.patientName}
          </button>
        </dd>
        <dt className="text-ink-3">Due</dt>
        <dd className="font-mono tnum">{at(t.dueAt)}</dd>
        <dt className="text-ink-3">Status</dt>
        <dd className={`font-mono font-bold ${t.status === "overdue" ? "text-alert" : "text-ink-2"}`}>{taskCode(t, now)}</dd>
        <dt className="text-ink-3">Owner</dt>
        <dd>{t.ownerName}</dd>
      </dl>
      <div className="mt-4 border-t border-line pt-3">
        <Micro>Where this task came from</Micro>
        {fromNotes ? <p className="hand mt-1 text-[22px] leading-tight">{t.source.replace("From the notes: ", "")}</p> : <p className="mt-1 text-[13px] text-ink-2">{t.source}</p>}
      </div>
      {t.kind !== "see_doctor" && t.status !== "done" && (
        <Button variant="solid" size="lg" className="mt-4 w-full" onClick={() => onDone(t)}>
          Mark done at {at(now)}
        </Button>
      )}
    </div>
  );
}

function TaskGroups({ tasks, now, onDone, onOpen }: { tasks: TaskView[]; now: number; onDone: (t: TaskView) => void; onOpen: (id: string) => void }) {
  const groups = new Map<string, TaskView[]>();
  for (const task of tasks) {
    const key = JSON.stringify([task.kind, task.kind === "see_doctor" ? "" : task.title, task.dueAt, task.ownerId ?? task.ownerName, task.status]);
    const group = groups.get(key);
    if (group) group.push(task);
    else groups.set(key, [task]);
  }
  return <ul className="rounds-task-list">{[...groups.values()].map((group) => group.length === 1 ? <TaskRow key={group[0].id} t={group[0]} now={now} onDone={onDone} onOpen={onOpen} /> : <li key={group[0].id}><details className="task-group calm-details"><summary><span><strong>{group.length} {group[0].kind === "see_doctor" ? "first assessments" : group[0].title}</strong><small><span className="font-mono tnum">{at(group[0].dueAt)}</span> · {group[0].ownerId ? shortStaff(group[0].ownerName) : group[0].ownerName}</small></span><span className={`font-mono tnum ${group[0].status === "overdue" ? "text-alert" : ""}`}>{taskCode(group[0], now)} <span aria-hidden>⌄</span></span></summary><ul>{group.map((task) => <TaskRow key={task.id} t={task} now={now} onDone={onDone} onOpen={onOpen} />)}</ul></details></li>)}</ul>;
}

export function Rounds({ dept, tasks, onDone, onOpen }: { dept: Department; tasks: TaskView[]; onDone: (t: TaskView) => void; onOpen: (id: string) => void }) {
  const [selected, setSelected] = useState<string | null>(null);
  const data = lanes(dept, tasks);
  const current = tasks.find((t) => t.id === selected) ?? tasks.find((t) => t.status === "overdue") ?? null;
  const open = tasks.filter((t) => t.status === "overdue" || t.status === "due" || (t.status === "upcoming" && t.dueAt - dept.now <= 120)).sort((a, b) => (a.status === "overdue" ? 0 : a.status === "due" ? 1 : 2) - (b.status === "overdue" ? 0 : b.status === "due" ? 1 : 2) || b.lateBy - a.lateBy || a.dueAt - b.dueAt);

  return (
    <div className="rounds-content grid min-h-0 xl:grid-cols-[minmax(0,1fr)_340px]">
      <section aria-labelledby="rounds-title" className="min-w-0 border-line xl:border-r">
        <SectionHead
          index="03"
          title="What needs doing?"
          aside={
            <span className="text-[13px] text-ink-2">Late tasks first</span>
          }
        />
        <span id="rounds-title" className="sr-only">
          Rounds timeline
        </span>
        <div className="border-t border-line">
          <div className="flex h-9 items-center px-4">
            <Micro>Late, due now and the next 2 hours · {open.length}</Micro>
          </div>
          {open.length ? <TaskGroups tasks={open} now={dept.now} onDone={onDone} onOpen={onOpen} /> : <div className="friendly-empty"><strong>Nothing due right now</strong><p>New care reminders appear as the shift advances.</p></div>}
        </div>
        <details className="calm-details rounds-timeline"><summary>Timeline and owners <span>Explore the next six hours</span></summary><Timeline d={dept} data={data} selected={current?.id ?? null} onSelect={setSelected} /></details>
      </section>
      <aside aria-label="Selected task" className="border-t border-line xl:border-t-0">
        {current ? (
          <Detail t={current} now={dept.now} onDone={onDone} onOpen={onOpen} />
        ) : (
          <p className="p-6 text-[13px] text-ink-3">Select a task on the timeline to see who owns it and where it came from.</p>
        )}
        <details className="calm-details"><summary>How late tasks are measured</summary><div className="p-4 text-[13px] leading-relaxed text-ink-2">
          A task turns late after its grace window: {dur(GRACE_MINUTES.medication)} for medicines, drips and observations, {dur(GRACE_MINUTES.dressing)} for dressings, tests and reviews. Late drips and medicines raise a high-priority alarm; the red tail shows how late a task is. Schedules: {FREQ_LABEL.every_12h}, {FREQ_LABEL.every_8h}, {FREQ_LABEL.every_6h}, {FREQ_LABEL.daily}.
        </div></details>
      </aside>
    </div>
  );
}
