"use client";

import { useState } from "react";
import { UI_COPY } from "@/er/uiCopy";
import type { Action, ActionKind, AdviseResponse, Kpis } from "@/er/types";
import type { UiLanguage } from "@/er/uiPreferences";

type Props = {
  actions: Action[];
  kpis: Kpis;
  language: UiLanguage;
  onApply: (kind: ActionKind) => void;
};

export function ActionsPanel({ actions, kpis, language, onApply }: Props) {
  const copy = UI_COPY[language];
  const [advice, setAdvice] = useState<AdviseResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function requestAdvice() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/advise", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kpis, actions, language: language === "ur" ? "ur" : "en" }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not generate the brief");
      setAdvice(body);
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-[#171717]" aria-labelledby="actions-title">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold tracking-[0.14em] text-black/40 uppercase dark:text-white/40">{copy.nextAction}</p>
          <h2 id="actions-title" className="mt-1 text-base font-bold text-black dark:text-white">{actions[0]?.title ?? copy.noAlerts}</h2>
        </div>
        <span className={`grid size-8 shrink-0 place-items-center rounded-full text-xs font-bold ${actions.length ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300" : "bg-[#FFEFB4] text-[#353A96]"}`}>{actions.length}</span>
      </div>

      {actions.length ? (
        <div className="mt-4 space-y-3">
          {actions.map((action) => (
            <article key={action.kind} className={`rounded-xl border p-3 ${action.severity === "critical" ? "border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/40" : "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30"}`}>
              <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">{action.detail}</p>
              <button type="button" onClick={() => onApply(action.kind)} className="mt-2.5 rounded-lg bg-[#353A96] px-3 py-2 text-[10px] font-bold text-white">{copy.apply}</button>
            </article>
          ))}
        </div>
      ) : <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{copy.noAlertsBody}</p>}

      {actions.length ? <div className="mt-4 border-t border-black/10 pt-4 dark:border-white/10">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-slate-900 dark:text-white">{copy.nurseBrief}</p>
            <p className="mt-0.5 text-[10px] text-slate-400">{copy.briefHint}</p>
          </div>
          {advice ? <span className="rounded-full bg-[#FFEFB4] px-2 py-1 text-[9px] font-bold text-[#353A96]">{advice.meta.mode}</span> : null}
        </div>
        {advice ? <p dir={language === "ur" ? "rtl" : "ltr"} className={`mt-3 whitespace-pre-line rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-700 dark:bg-slate-950 dark:text-slate-300 ${language === "ur" ? "font-urdu text-right leading-[2.3]" : ""}`}>{advice.message}</p> : null}
        {error ? <p className="mt-2 text-[10px] text-rose-600 dark:text-rose-400">{error}</p> : null}
        <button type="button" onClick={requestAdvice} disabled={loading} className="mt-3 w-full rounded-lg border border-black/15 px-3 py-2.5 text-[10px] font-bold text-black hover:bg-[#FFEFB4] disabled:opacity-50 dark:border-white/15 dark:text-white dark:hover:bg-white/5">
          {loading ? copy.preparing : advice ? copy.refreshBrief : copy.generateBrief}
        </button>
      </div> : null}
    </section>
  );
}
