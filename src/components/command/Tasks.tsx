"use client";

import { useState } from "react";
import type { TaskView } from "@/er/types";
import { at, dur, KIND_LABEL, shortStaff, STATUS_TONE, TONE_TEXT } from "./format";
import { Button } from "./ui";
import type { LogEntry } from "./useCommand";

export function taskCode(t: TaskView, now: number) {
  if (t.status === "done") return t.lateBy > 0 ? `Done · ${dur(t.lateBy)} late` : "Done";
  if (t.status === "overdue") return `${dur(t.lateBy)} overdue`;
  if (t.status === "due") return "Due now";
  return `In ${dur(t.dueAt - now)}`;
}

export function TaskRow({ t, now, onDone, onOpen, showPatient = true }: { t: TaskView; now: number; onDone?: (t: TaskView) => void; onOpen?: (patientId: string) => void; showPatient?: boolean }) {
  return <li className="task-row"><div className="task-row-main"><div className="task-row-title">{t.kind === "see_doctor" ? KIND_LABEL.see_doctor : t.title}</div><div className="task-row-meta">{showPatient && <><button type="button" onClick={() => onOpen?.(t.patientId)}>{t.patientName}</button><br /></>}{t.ownerId ? shortStaff(t.ownerName) : t.ownerName} · <span className="tnum">{at(t.dueAt)}</span>{t.escalatedAt !== null && <span className="text-alert"> · Escalated</span>}</div></div><div className="task-row-actions"><span className={`tnum ${TONE_TEXT[STATUS_TONE[t.status]]}`}>{taskCode(t, now)}</span>{onDone && t.kind !== "see_doctor" && t.status !== "done" && <Button size="sm" onClick={() => onDone(t)} aria-label={`Mark ${t.title} for ${t.patientName} as done`}>Done ✓</Button>}</div></li>;
}

export function ShiftLog({ log }: { log: LogEntry[] }) {
  const [expanded, setExpanded] = useState(false);
  const display: (LogEntry & { count: number })[] = [];
  for (const entry of log) {
    const previous = display[display.length - 1];
    if (previous?.text === entry.text) previous.count++;
    else display.push({ ...entry, count: 1 });
  }
  return <><ol className="shift-log" aria-label="Shift activity">{(expanded ? display : display.slice(0, 3)).map((entry) => <li key={entry.id}><time>{at(entry.at)}</time><span className={entry.tone === "alert" ? "text-alert" : "text-ink-2"}>{entry.text}{entry.count > 1 && <strong> ×{entry.count}</strong>}</span></li>)}</ol>{display.length > 3 && <button type="button" className="log-toggle" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>{expanded ? "Show less" : `View all ${display.length} events`}</button>}</>;
}
