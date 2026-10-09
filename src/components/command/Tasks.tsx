import type { TaskView } from "@/er/types";
import { at, dur, KIND_LABEL, shortStaff, STATUS_TONE, TONE_TEXT } from "./format";
import { Button, Glyph } from "./ui";
import type { LogEntry } from "./useCommand";

export function taskCode(t: TaskView, now: number) {
  if (t.status === "done") return t.lateBy > 0 ? `DONE +${dur(t.lateBy)}` : "DONE";
  if (t.status === "overdue") return `LATE ${dur(t.lateBy)}`;
  if (t.status === "due") return "DUE NOW";
  return `IN ${dur(t.dueAt - now)}`;
}

export function TaskRow({ t, now, onDone, onOpen, showPatient = true }: { t: TaskView; now: number; onDone?: (t: TaskView) => void; onOpen?: (patientId: string) => void; showPatient?: boolean }) {
  const tone = STATUS_TONE[t.status];
  return (
    <li className={`grid grid-cols-[48px_14px_minmax(0,1fr)_auto] items-center gap-x-3 border-b border-line px-4 py-2.5 ${t.status === "done" ? "opacity-55" : ""}`}>
      <span className="font-mono text-[13px] text-ink-2 tnum">{at(t.dueAt)}</span>
      <Glyph kind={t.kind} status={t.status} />
      <span className="min-w-0">
        <span className="block truncate font-bold">{t.kind === "see_doctor" ? KIND_LABEL.see_doctor : t.title}</span>
        <span className="block truncate text-[12px] text-ink-3">
          {showPatient && (
            <button type="button" className="text-ink-2 underline decoration-line underline-offset-2 hover:decoration-ink-2" onClick={() => onOpen?.(t.patientId)}>
              {t.patientName}
            </button>
          )}
          {showPatient && " · "}
          {t.role === "nurse" ? "Nurse" : "Doctor"}: {t.ownerId ? shortStaff(t.ownerName) : t.ownerName}
          {t.escalatedAt !== null && <span className="ml-1.5 font-bold text-alert">· Escalated</span>}
        </span>
      </span>
      <span className="flex items-center gap-2.5">
        <span className={`font-mono text-[12px] font-bold tracking-[0.03em] ${TONE_TEXT[tone]}`}>{taskCode(t, now)}</span>
        {onDone && t.kind !== "see_doctor" && t.status !== "done" && (
          <Button size="sm" onClick={() => onDone(t)} aria-label={`Mark ${t.title} for ${t.patientName} as done`}>
            Done
          </Button>
        )}
      </span>
    </li>
  );
}

export function ShiftLog({ log }: { log: LogEntry[] }) {
  return (
    <ol className="thin-scroll max-h-[260px] overflow-y-auto font-mono text-[12px]" aria-label="Shift log">
      {log.map((e) => (
        <li key={e.id} className="type-in grid grid-cols-[48px_minmax(0,1fr)] gap-x-3 border-b border-line px-4 py-2">
          <span className="text-ink-3 tnum">{at(e.at)}</span>
          <span className={e.tone === "alert" ? "text-alert" : e.tone === "ok" ? "text-ok" : "text-ink-2"}>{e.text}</span>
        </li>
      ))}
    </ol>
  );
}
