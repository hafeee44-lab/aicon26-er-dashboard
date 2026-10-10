"use client";

import { useState } from "react";
import type { Action, ActionKind, AdviseResponse, Kpis } from "@/er/types";
import type { Language } from "@/lib/types";
import { Button, ModeBadge, SectionHead, Seg } from "./ui";

export const FIX: Record<ActionKind, string> = {
  call_doctor: "Call backup doctor",
  open_overflow: "Open overflow",
  free_beds: "Ask for discharges",
  redirect_minor: "Send to clinic",
  transfer: "Start transfers",
  escalate_tasks: "Escalate now",
};

function Alarm({ action, onApply }: { action: Action; onApply: (kind: ActionKind) => void }) {
  const high = action.severity === "critical";
  return (
    <li className="grid grid-cols-[52px_minmax(0,1fr)] border-b border-line last:border-b-0">
      <div className={`flex items-start justify-center pt-3.5 font-mono text-[10px] font-extrabold tracking-[0.1em] ${high ? "bg-alert text-inverse" : "bg-warn text-inverse"}`}>
        {high ? "HIGH" : "MED"}
      </div>
      <div className="flex min-w-0 flex-col items-start gap-2.5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 xl:flex-col xl:items-start xl:gap-2.5">
        <div className="min-w-0">
          <div className="font-bold">{action.title}</div>
          <p className="mt-1 text-[13px] leading-snug text-ink-2 sm:truncate xl:whitespace-normal" title={action.detail}>
            {action.detail}
          </p>
        </div>
        <Button size="sm" variant={high ? "alert" : "line"} onClick={() => onApply(action.kind)}>
          {FIX[action.kind]}
        </Button>
      </div>
    </li>
  );
}

export function AlarmList({ actions, escalated, onApply }: { actions: Action[]; escalated: number; onApply: (kind: ActionKind) => void }) {
  const sorted = [...actions].sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "critical" ? -1 : 1));
  return (
    <section aria-label="Alarms">
      <SectionHead index="02" title="Alarms" aside={<span className={`font-mono text-[11px] ${sorted.length ? "text-alert" : escalated ? "text-warn" : "text-ok"}`}>{sorted.length ? `${sorted.length} active` : escalated ? `${escalated} escalated` : "All clear"}</span>} />
      <ul aria-live="polite">
        {sorted.length === 0 && escalated > 0 && (
          <li className="flex items-center gap-3 px-4 py-4 text-[13px] text-ink-2">
            <span className="size-2 flex-none rounded-full bg-warn" aria-hidden />
            No new alarms. {escalated} late task{escalated > 1 ? "s were" : " was"} escalated and still need{escalated > 1 ? "" : "s"} doing: mark {escalated > 1 ? "them" : "it"} done when given.
          </li>
        )}
        {sorted.length === 0 && escalated === 0 && (
          <li className="flex items-center gap-3 px-4 py-4 text-[13px] text-ink-2">
            <span className="size-2 flex-none rounded-full bg-ok" aria-hidden />
            No alarms. Every patient and task is on time.
          </li>
        )}
        {sorted.length > 0 && (
          sorted.map((a) => <Alarm key={`${a.kind}-${a.title}`} action={a} onApply={onApply} />)
        )}
      </ul>
    </section>
  );
}

export function Brief({ kpis, actions }: { kpis: Kpis; actions: Action[] }) {
  const [language, setLanguage] = useState<Language>("en");
  const [brief, setBrief] = useState<(AdviseResponse & { key: string; language: Language }) | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const key = actions.map((a) => a.kind).join(",");

  async function write() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/advise", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kpis, actions, language }) });
      if (!res.ok) throw new Error("The brief could not be written. Try again.");
      setBrief({ ...((await res.json()) as AdviseResponse), key, language });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section aria-label="AI brief for the charge nurse">
      <SectionHead
        index="04"
        title="AI brief"
        aside={
          <>
            <Seg<Language>
              label="Brief language"
              value={language}
              onChange={setLanguage}
              options={[
                { value: "en", label: "EN" },
                { value: "ur", label: "اردو" },
              ]}
            />
            <Button size="sm" variant="solid" onClick={write} disabled={loading}>
              {loading ? "Writing…" : brief ? "Rewrite" : "Write brief"}
            </Button>
          </>
        }
      />
      <div aria-live="polite" aria-busy={loading} className={`min-h-[96px] px-4 py-4 ${loading ? "scanning" : ""}`}>
        {error && <p className="text-[13px] text-alert">{error}</p>}
        {!brief && !error && (
          <p className="text-[13px] text-ink-3">
            {loading ? "Reading the alarms and live numbers…" : "A short handover the charge nurse can read aloud, written from the alarms and live numbers. It never gives advice about individual patients."}
          </p>
        )}
        {brief && (
          <>
            <div dir={brief.language === "ur" ? "rtl" : "ltr"} className={brief.language === "ur" ? "font-urdu text-[17px] leading-[2.1]" : "text-[14px] leading-relaxed"}>
              {brief.message
                .split("\n")
                .filter(Boolean)
                .map((line, i) => (
                  <p key={`${brief.key}-${brief.language}-${i}`} className="type-in" style={{ animationDelay: `${i * 140}ms` }}>
                    {line}
                  </p>
                ))}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <ModeBadge mode={brief.meta.mode} cached={brief.meta.cached} />
              {brief.key !== key && <span className="text-[12px] text-warn">The alarms changed since this brief</span>}
              {brief.language !== language && <span className="text-[12px] text-ink-3">Rewrite to switch language</span>}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
