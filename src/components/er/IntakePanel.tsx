"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { triage } from "@/er/engine";
import { UI_COPY } from "@/er/uiCopy";
import type { Intake, IntakeResponse, Level, Needs } from "@/er/types";
import type { UiLanguage } from "@/er/uiPreferences";

type Props = {
  language: UiLanguage;
  onAdmit: (intake: Intake, needs: Needs, review: string[]) => void;
  onClose: () => void;
};

type Parsed = Pick<IntakeResponse, "intake" | "needs" | "review" | "meta">;
const LEVEL_STYLE: Record<Level, string> = { 1: "bg-red-600", 2: "bg-orange-500", 3: "bg-yellow-400", 4: "bg-green-600", 5: "bg-blue-600" };
const nullableNumber = (value: string) => value === "" ? null : Number(value);

export function IntakePanel({ language, onAdmit, onClose }: Props) {
  const copy = UI_COPY[language];
  const [note, setNote] = useState("67 saal mard, seene mein dard aur paseena, BP 88/60, pulse 112, sat 94");
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function readNote() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/intake", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ note }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not read the note");
      setParsed(body);
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function updateIntake(patch: Partial<Intake>) {
    setParsed((current) => current ? { ...current, intake: { ...current.intake, ...patch } } : current);
  }

  function updateVitals(key: keyof Intake["vitals"], value: number | null) {
    setParsed((current) => current ? { ...current, intake: { ...current.intake, vitals: { ...current.intake.vitals, [key]: value } } } : current);
  }

  function confirm() {
    if (!parsed) return;
    onAdmit(parsed.intake, parsed.needs, parsed.review);
    onClose();
  }

  const preview = parsed ? triage(parsed.intake, parsed.needs) : null;

  return (
    <div className="intake-sheet flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden" role="dialog" aria-modal="true" aria-labelledby="intake-title">
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-5 dark:border-slate-800">
        <div>
          <h2 id="intake-title" className="text-lg font-bold text-slate-950 dark:text-white">{copy.intakeTitle}</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{copy.intakeHint}</p>
        </div>
        <button type="button" onClick={onClose} className="intake-close" aria-label="Close intake">×</button>
      </div>

      <div className="overflow-y-auto p-5">
        <label className="text-[10px] font-bold tracking-wide text-slate-500 uppercase" htmlFor="nurse-note">{copy.nurseNote}</label>
        <textarea id="nurse-note" value={note} onChange={(event) => setNote(event.target.value)} rows={4} placeholder={copy.notePlaceholder} className="intake-note mt-2 w-full resize-y p-3 text-sm leading-relaxed outline-none" />
        <button type="button" onClick={() => setNote("72 saal aurat, bukhar, confusion, sat 89, pulse 108")} className="mt-2 rounded-full border border-[var(--border)] px-3 py-2 text-[10px] font-semibold text-[var(--muted)]">Try an example note</button>
        <button type="button" onClick={readNote} disabled={loading || !note.trim()} className="primary-button mt-3 w-full disabled:opacity-50">{loading ? copy.reading : copy.readNote}</button>
        {error ? <p className="mt-2 text-xs text-rose-600 dark:text-rose-400">{error}</p> : null}

        {parsed && preview ? (
          <div className="mt-5 border-t border-slate-100 pt-5 dark:border-slate-800">
            <div className="flex items-center gap-3 rounded-xl bg-slate-100 p-3 dark:bg-slate-950">
              <span className={`grid size-11 place-items-center rounded-lg text-lg font-bold text-white ${LEVEL_STYLE[preview.level]}`}>L{preview.level}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2"><p className="text-sm font-bold text-slate-950 dark:text-white">{copy.triagePreview}</p><span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">{parsed.meta.mode}</span></div>
                <p className="mt-1 truncate text-[10px] text-slate-500 dark:text-slate-400">{preview.flags[0] ?? `${parsed.needs.resources.length} predicted resources`}</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <Field label="Name"><input value={parsed.intake.name} onChange={(event) => updateIntake({ name: event.target.value })} className="field-input" /></Field>
              <Field label="Age"><input type="number" value={parsed.intake.age ?? ""} onChange={(event) => updateIntake({ age: nullableNumber(event.target.value) })} className="field-input" /></Field>
              <div className="col-span-2"><Field label="Complaint"><input value={parsed.intake.complaint} onChange={(event) => updateIntake({ complaint: event.target.value })} className="field-input" /></Field></div>
              {(["hr", "sbp", "dbp", "spo2", "pain"] as const).map((key) => (
                <Field key={key} label={key}><input type="number" value={parsed.intake.vitals[key] ?? ""} onChange={(event) => updateVitals(key, nullableNumber(event.target.value))} className={`field-input ${parsed.review.includes(key) ? "border-amber-400 bg-amber-50 dark:bg-amber-950/30" : ""}`} /></Field>
              ))}
            </div>

            <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs dark:bg-slate-950">
              <div className="flex items-center justify-between gap-3"><span className="font-bold text-slate-700 dark:text-slate-300">{copy.predictedNeeds}</span><span className="font-semibold text-slate-500">{parsed.needs.specialty} → {parsed.needs.destination}</span></div>
              <p className="mt-2 leading-relaxed text-slate-600 dark:text-slate-400">{parsed.needs.reason}</p>
              {parsed.review.length ? <p className="mt-2 font-bold text-amber-700 dark:text-amber-400">{copy.checkBefore}: {parsed.review.join(", ")}</p> : null}
            </div>
          </div>
        ) : null}
      </div>

      {parsed ? <div className="border-t border-slate-100 p-4 dark:border-slate-800"><button type="button" onClick={confirm} className="primary-button w-full">Add to queue</button></div> : null}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block text-[9px] font-bold tracking-wide text-slate-400 uppercase">{label}{children}</label>;
}
