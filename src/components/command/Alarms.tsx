"use client";

import { useState } from "react";
import type { Action, ActionKind, AdviseResponse, Kpis } from "@/er/types";
import type { Language } from "@/lib/types";
import { Button, ModeBadge, SectionHead, Seg } from "./ui";

const FIX: Record<ActionKind, string> = {
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
    <li className="grid grid-cols-[52px_minmax(0,1fr)] border-b border-line">
      <div className={`flex items-start justify-center pt-3.5 font-mono text-[10px] font-extrabold tracking-[0.1em] ${high ? "bg-alert text-white" : "bg-warn text-black"}`}>
        {high ? "HIGH" : "MED"}
      </div>
      <div className="px-4 py-3">
        <div className="font-bold">{action.title}</div>
        <p className="mt-1 text-[13px] leading-snug text-ink-2">{action.detail}</p>
        <Button size="sm" variant={high ? "alert" : "line"} className="mt-2.5" onClick={() => onApply(action.kind)}>
          {FIX[action.kind]}
        </Button>
      </div>
    </li>
  );
}

function Brief({ kpis, actions }: { kpis: Kpis; actions: Action[] }) {
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
      if (!res.ok) throw new Error("The brief could not be written");
      setBrief({ ...((await res.json()) as AdviseResponse), key, language });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="border-t border-line">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
        <span className="micro">AI brief for the charge nurse</span>
        <div className="flex items-center gap-2">
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
        </div>
      </div>
      <div aria-live="polite" className={`min-h-[92px] px-4 pb-4 ${loading ? "scanning" : ""}`}>
        {error && <p className="text-[13px] text-alert">{error}</p>}
        {!brief && !error && !loading && (
          <p className="text-[13px] text-ink-3">The AI turns the alarms and live numbers into a short handover the charge nurse can read aloud. It never gives advice about individual patients.</p>
        )}
        {brief && (
          <>
            <div dir={brief.language === "ur" ? "rtl" : "ltr"} className={brief.language === "ur" ? "font-urdu text-[17px] leading-[2.1]" : "text-[14px] leading-relaxed"}>
              {brief.message.split("\n").filter(Boolean).map((line, i) => (
                <p key={`${brief.key}-${i}`} className="type-in" style={{ animationDelay: `${i * 140}ms` }}>
                  {line}
                </p>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <ModeBadge mode={brief.meta.mode} cached={brief.meta.cached} />
              {brief.key !== key && <span className="text-[12px] text-warn">The alarms changed since this brief</span>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function Alarms({ actions, kpis, onApply }: { actions: Action[]; kpis: Kpis; onApply: (kind: ActionKind) => void }) {
  const sorted = [...actions].sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "critical" ? -1 : 1));

  return (
    <section aria-labelledby="alarms-title" className="flex flex-col">
      <SectionHead index="02" title="Alarms" aside={<span className={`font-mono text-[11px] ${sorted.length ? "text-alert" : "text-ok"}`}>{sorted.length ? `${sorted.length} active` : "All clear"}</span>} />
      <span id="alarms-title" className="sr-only">
        Alarms and fixes
      </span>
      <ul aria-live="polite">
        {sorted.length === 0 ? (
          <li className="flex items-center gap-3 border-b border-line px-4 py-4 text-[13px] text-ink-2">
            <span className="size-2 rounded-full bg-ok" aria-hidden />
            No alarms. Every patient and task is on time.
          </li>
        ) : (
          sorted.map((a) => <Alarm key={`${a.kind}-${a.title}`} action={a} onApply={onApply} />)
        )}
      </ul>
      <Brief kpis={kpis} actions={actions} />
    </section>
  );
}
