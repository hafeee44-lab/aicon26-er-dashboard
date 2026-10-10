import type { TaskView } from "@/er/types";
import { at, dur, KIND_LABEL, shortStaff } from "./format";
import { Button, Glyph } from "./ui";
import type { LogEntry } from "./useCommand";

export function taskCode(t: TaskView, now: number) {
  if (t.status === "done") return t.lateBy > 0 ? `Done · ${dur(t.lateBy)} late` : "Done";
  if (t.status === "overdue") return `${dur(t.lateBy)} late`;
  if (t.status === "due") return "Due now";
  return `In ${dur(t.dueAt - now)}`;
}

export function TaskRow({ t, now, onDone, onOpen, showPatient = true }: { t: TaskView; now: number; onDone?: (t: TaskView) => void; onOpen?: (patientId: string) => void; showPatient?: boolean }) {
  return <li className={`calm-task-row ${t.status === "done" ? "is-done" : ""}`}><span className="font-mono tnum task-at">{at(t.dueAt)}</span><Glyph kind={t.kind} status={t.status === "overdue" ? "overdue" : undefined} /><span className="task-description"><strong>{t.kind === "see_doctor" ? KIND_LABEL.see_doctor : t.title}</strong><small>{showPatient && <><button type="button" className="patient-link" onClick={() => onOpen?.(t.patientId)}>{t.patientName}</button> · </>}{t.ownerId ? shortStaff(t.ownerName) : t.ownerName}{t.escalatedAt !== null && <span className="text-alert"> · Escalated</span>}</small></span><span className="task-feedback"><span className={`font-mono tnum ${t.status === "overdue" ? "text-alert" : "text-ink-2"}`}>{taskCode(t, now)}</span>{onDone && t.kind !== "see_doctor" && t.status !== "done" && <Button size="lg" onClick={() => onDone(t)} aria-label={`Mark ${t.title} for ${t.patientName} as done`}>Done</Button>}</span></li>;
}

export function ShiftLog({ log }: { log: LogEntry[] }) {
  const groups = log.reduce<(LogEntry & { count: number })[]>((items, entry) => {
    const previous = items[items.length - 1];
    if (previous && previous.text === entry.text && previous.tone === entry.tone) previous.count += 1;
    else items.push({ ...entry, count: 1 });
    return items;
  }, []);
  const rows = (entries: typeof groups) => entries.map((e) => <li key={e.id}><span className="font-mono tnum">{at(e.at)}</span><span>{e.text === "Smart allocation switched on" ? "Smart allocation on" : e.text}{e.count > 1 && <b className="font-mono"> ×{e.count}</b>}</span></li>);
  return <div className="shift-log"><ol aria-label="Latest shift log entries">{rows(groups.slice(0, 3))}</ol>{groups.length > 3 && <details className="calm-details"><summary>View all <span>{groups.length - 3} earlier entries</span></summary><ol aria-label="Earlier shift log entries">{rows(groups.slice(3))}</ol></details>}{!groups.length && <p className="friendly-empty">Shift actions will appear here as you work.</p>}</div>;
}
