"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { TARGET_MINUTES, triage } from "@/er/engine";
import { demoNotes } from "@/er/demo-notes";
import type { Consciousness, Intake, IntakeResponse, Needs, Vitals } from "@/er/types";
import { DESTINATION_LABEL, dur } from "./format";
import { Button, Icon, LevelTile, Micro, ModeBadge, Seg, useDialogFocus } from "./ui";

const LABELS = [
  "Chest pain · 67 M",
  "Breathless, SpO₂ 89 · 72 F",
  "Infant fever · 8 mo",
  "Bleeding · 34 weeks",
  "Bike accident · 22 M",
  "اردو · abdominal pain",
  "Stomach pain · 50 M",
  "Ankle twist · 19 F",
  "Sore throat · 35 M",
];

type Mark = { start: number; end: number; color: string; label: string };

const FIELDS: { key: keyof Vitals; label: string; color: string; step?: string }[] = [
  { key: "hr", label: "Heart rate", color: "text-ink" },
  { key: "sbp", label: "Systolic pressure", color: "text-ink" },
  { key: "dbp", label: "Diastolic pressure", color: "text-ink" },
  { key: "spo2", label: "Oxygen %", color: "text-ink" },
  { key: "rr", label: "Breathing rate", color: "text-ink" },
  { key: "temp", label: "Temperature °C", color: "text-ink", step: "0.1" },
  { key: "pain", label: "Pain / 10", color: "text-ink" },
];

function marks(note: string, intake: Intake): Mark[] {
  const v = intake.vitals;
  const wanted: { needle: string | null; color: string; label: string }[] = [
    { needle: v.sbp !== null && v.dbp !== null ? `${v.sbp}/${v.dbp}` : null, color: "var(--bp)", label: `Blood pressure ${v.sbp}/${v.dbp}` },
    { needle: v.hr !== null ? String(v.hr) : null, color: "var(--hr)", label: `Heart rate ${v.hr}` },
    { needle: v.spo2 !== null ? String(v.spo2) : null, color: "var(--spo2)", label: `SpO₂ ${v.spo2}%` },
    { needle: v.rr !== null ? String(v.rr) : null, color: "var(--rr)", label: `Breathing rate ${v.rr}` },
    { needle: v.temp !== null ? String(v.temp) : null, color: "var(--temp)", label: `Temperature ${v.temp} °C` },
    { needle: v.pain !== null ? `${v.pain}/10` : null, color: "var(--ink)", label: `Pain ${v.pain}/10` },
    { needle: intake.age !== null && intake.age >= 1 ? String(Math.round(intake.age)) : null, color: "var(--ink-2)", label: `Age ${intake.age}` },
  ];
  const found: Mark[] = [];
  for (const w of wanted) {
    if (!w.needle) continue;
    const re = new RegExp(`(?<![\\d.])${w.needle.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")}(?![\\d])`, "g");
    for (const m of note.matchAll(re)) {
      const start = m.index ?? 0;
      const end = start + w.needle.length;
      if (found.some((f) => start < f.end && end > f.start)) continue;
      found.push({ start, end, color: w.color, label: w.label });
      break;
    }
  }
  return found.sort((a, b) => a.start - b.start);
}

function Highlighted({ note, intake }: { note: string; intake: Intake }) {
  const ms = marks(note, intake);
  const parts: ReactNode[] = [];
  let last = 0;
  ms.forEach((m, i) => {
    parts.push(note.slice(last, m.start));
    parts.push(
      <mark key={i} title={`Read as ${m.label}`} className="rounded-[2px] bg-transparent px-0.5 font-bold" style={{ color: m.color, boxShadow: `inset 0 -2px 0 ${m.color}` }}>
        {note.slice(m.start, m.end)}
      </mark>,
    );
    last = m.end;
  });
  parts.push(note.slice(last));
  return <p className="font-mono text-[15px] leading-relaxed whitespace-pre-wrap">{parts}</p>;
}

type Rec = {
  lang: string;
  interimResults: boolean;
  onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
  onerror: (e: { error: string }) => void;
  onend: () => void;
  start: () => void;
};

export function IntakeConsole({ onClose, onAdmit }: { onClose: () => void; onAdmit: (intake: Intake, needs: Needs, review: string[]) => void }) {
  const dialogRef = useDialogFocus();
  const [note, setNote] = useState("");
  const [read, setRead] = useState<{ note: string; response: IntakeResponse } | null>(null);
  const [intake, setIntake] = useState<Intake | null>(null);
  const [needs, setNeeds] = useState<Needs | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [listening, setListening] = useState(false);
  const boxRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    boxRef.current?.focus();
  }, []);

  async function submit(text = note) {
    if (!text.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/intake", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ note: text }) });
      const body = (await res.json()) as IntakeResponse & { error?: string };
      if (!res.ok) throw new Error(body.error || "The note could not be read");
      setRead({ note: text, response: body });
      setIntake({ ...body.intake, name: /^unknown$/i.test(body.intake.name.trim()) ? "" : body.intake.name });
      setNeeds(body.needs);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function dictate() {
    const w = window as unknown as { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) {
      setError("Dictation needs Chrome or Edge. Type the note instead.");
      return;
    }
    const rec = new Ctor();
    rec.lang = "en-PK";
    rec.interimResults = false;
    rec.onresult = (e) => setNote((n) => `${n} ${Array.from(e.results).map((r) => r[0].transcript).join(" ")}`.trim());
    rec.onend = () => setListening(false);
    rec.onerror = (e) => {
      setListening(false);
      setError(e.error === "not-allowed" ? "Allow microphone access to dictate." : "Dictation stopped. Type the note instead.");
    };
    setListening(true);
    rec.start();
  }

  const result = intake && needs ? triage(intake, needs) : null;
  const review = read?.response.review ?? [];
  const setVital = (key: keyof Vitals, raw: string) =>
    setIntake((i) => (i ? { ...i, vitals: { ...i.vitals, [key]: raw === "" ? null : key === "consciousness" ? (raw as Consciousness) : Number(raw) } } : i));

  return (
    <div ref={dialogRef} className="intake-overlay" role="dialog" aria-modal="true" aria-labelledby="intake-title">
      <div className="intake-sheet">
        <div className="intake-source">
          <div className="intake-heading">
            <div><p className="eyebrow">From note to next step</p><h2 id="intake-title">Welcome a new patient.</h2></div>
            <Button size="sm" onClick={onClose} aria-keyshortcuts="Escape" aria-label="Close new arrival">
              <Icon name="close" />
            </Button>
          </div>
          <div className="flex flex-1 flex-col gap-4 p-5">
            <details className="example-notes">
              <summary>Try an example note · English / اردو / Roman Urdu</summary>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {demoNotes.map((n, i) => (
                  <button
                    key={n}
                    type="button"
                    disabled={loading}
                    className={`btn btn-sm ${LABELS[i]?.startsWith("اردو") ? "font-urdu" : ""}`}
                    onClick={() => {
                      setNote(n);
                      submit(n);
                    }}
                  >
                    {LABELS[i] ?? n.slice(0, 24)}
                  </button>
                ))}
              </div>
            </details>
            <label htmlFor="intake-note" className="font-semibold">
              Paste the nurse’s note
            </label>
            <textarea
              id="intake-note"
              ref={boxRef}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
              }}
              rows={5}
              dir="auto"
              placeholder="67 saal mard, seene mein dard aur paseena, BP 88/60, pulse 112, sat 94"
              className="ruled w-full resize-none border border-line bg-raised px-4 py-1 font-mono text-[17px] leading-[28px] outline-none focus:border-ink-3"
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="solid" size="lg" onClick={() => submit()} disabled={loading || !note.trim()}>
                {loading ? "Reading…" : "Read note"}
                <kbd className="font-mono text-[10px] opacity-60">⌘↵</kbd>
              </Button>
              <Button size="lg" onClick={dictate} disabled={listening}>
                {listening ? "Listening…" : "Dictate"}
              </Button>
            </div>
            {error && <p className="text-[13px] text-alert">{error}</p>}
            {read && intake && (
              <div className="border-t border-line pt-4">
                <Micro>What the AI took from the note</Micro>
                <div className="mt-2">
                  <Highlighted note={read.note} intake={intake} />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className={`intake-preview flex flex-col ${loading ? "scanning" : ""}`} aria-busy={loading}>
          {!result || !intake || !needs ? (
            <div className="reading-steps">
              {[
                ["01", "Start with what you know.", "Paste or dictate a note in English, Urdu or Roman Urdu."],
                ["02", "Review what was read.", "Check extracted facts. Uncertain fields stay marked; missing values stay empty."],
                ["03", "Give care a clear next step.", "Confirm the patient. Rules set the priority and a doctor target time."],
              ].map(([n, t, b]) => (
                <div key={n} className="reading-step">
                  <span>{n}</span>
                  <div>
                    <strong>{t}</strong>
                    <p className="mt-0.5 text-[13px] text-ink-2">{b}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-start gap-4 border-b border-line p-5">
                <LevelTile level={result.level} size="lg" />
                <div className="min-w-0 flex-1">
                  <div className="text-[22px] leading-tight font-semibold">Review before adding</div>
                  <div className="font-mono text-[12px] text-ink-2">See a doctor {TARGET_MINUTES[result.level] === 0 ? "now" : `within ${dur(TARGET_MINUTES[result.level])}`}</div>
                  <ul className="mt-2 space-y-1 text-[13px]">
                    {(result.flags.length ? result.flags : [`No danger signs · ${needs.resources.length} likely needs`]).map((f) => (
                      <li key={f}>· {f}</li>
                    ))}
                  </ul>
                </div>
                {read && <ModeBadge mode={read.response.meta.mode} cached={read.response.meta.cached} />}
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-3 border-b border-line p-5">
                <label className="col-span-2 text-[12px]">
                  <span className="micro">Name</span>
                  <input value={intake.name} onChange={(e) => setIntake({ ...intake, name: e.target.value })} placeholder="Not in the note: leave blank to label by arrival time" className="mt-1 h-9 w-full border border-line bg-raised px-2.5 outline-none focus:border-ink-3" />
                </label>
                <label className="text-[12px]">
                  <span className={`micro ${review.includes("age") ? "text-warn!" : ""}`}>Age {review.includes("age") && "· check"}</span>
                  <input type="number" value={intake.age ?? ""} onChange={(e) => setIntake({ ...intake, age: e.target.value === "" ? null : Number(e.target.value) })} className={`mt-1 h-9 w-full border bg-raised px-2.5 font-mono outline-none focus:border-ink-3 ${review.includes("age") ? "border-warn" : "border-line"}`} />
                </label>
                <div className="text-[12px]">
                  <span className="micro">Sex</span>
                  <div className="mt-1">
                    <Seg<string>
                      label="Sex"
                      value={intake.sex ?? ""}
                      onChange={(s) => setIntake({ ...intake, sex: s === "" ? null : (s as "male" | "female") })}
                      options={[
                        { value: "female", label: "F" },
                        { value: "male", label: "M" },
                        { value: "", label: "?" },
                      ]}
                    />
                  </div>
                </div>
                <label className="col-span-2 text-[12px]">
                  <span className="micro">Complaint</span>
                  <input value={intake.complaint} onChange={(e) => setIntake({ ...intake, complaint: e.target.value })} className="mt-1 h-9 w-full border border-line bg-raised px-2.5 outline-none focus:border-ink-3" />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3 border-b border-line p-5">
                {FIELDS.map((f) => {
                  const check = review.includes(f.key);
                  return (
                    <label key={f.key} className={`rounded-xl border bg-panel px-3 py-3 ${check ? "border-warn border-dashed" : "border-line"}`}>
                      <span className={`text-[13px] font-semibold ${check ? "text-warn" : f.color}`}>
                        {f.label}
                        {check && " ·?"}
                      </span>
                      <input
                        type="number"
                        step={f.step ?? "1"}
                        value={intake.vitals[f.key] ?? ""}
                        onChange={(e) => setVital(f.key, e.target.value)}
                        aria-label={f.label}
                        className={`mt-0.5 w-full bg-transparent font-mono text-[20px] font-bold outline-none ${f.color}`}
                        placeholder="Not recorded"
                      />
                    </label>
                  );
                })}
                <label className="rounded-xl border border-line bg-panel px-3 py-3">
                  <span className="text-[13px] font-semibold text-ink">Consciousness</span>
                  <select value={intake.vitals.consciousness ?? ""} onChange={(e) => setVital("consciousness", e.target.value)} className="mt-1 w-full bg-transparent font-mono text-[12px] font-bold outline-none" aria-label="Consciousness">
                    <option value="">Not recorded</option>
                    <option value="alert">Alert</option>
                    <option value="voice">Voice</option>
                    <option value="pain">Pain</option>
                    <option value="unresponsive">None</option>
                  </select>
                </label>
              </div>

              <div className="border-b border-line p-5 text-[13px]">
                <Micro>Predicted needs · not a diagnosis</Micro>
                <p className="mt-1.5 text-ink-2">
                  <span className="text-ink capitalize">{needs.specialty}</span> · {needs.resources.join(", ").replaceAll("_", " ") || "examination only"} · likely {DESTINATION_LABEL[needs.destination].toLowerCase()}
                  {needs.highRisk && <span className="font-bold text-alert"> · high risk</span>}
                </p>
                {needs.reason && <p className="mt-1.5 text-ink-3">{needs.reason}</p>}
                <label className="mt-3 flex items-center gap-2 text-ink-2">
                  <input type="checkbox" checked={needs.highRisk} onChange={(e) => setNeeds({ ...needs, highRisk: e.target.checked })} />
                  High-risk situation (raises the level, never lowers it)
                </label>
              </div>

              <div className="mt-auto flex flex-wrap items-center justify-between gap-3 p-5">
                <span className="text-[12px] text-ink-3">{review.length ? `Check ${review.length} field${review.length > 1 ? "s" : ""} the AI was unsure about` : "Nothing flagged for checking"}</span>
                {read?.note !== note && <p className="text-warn text-[13px]">The note changed. Read it again before adding.</p>}
                <Button variant="solid" size="lg" disabled={loading || read?.note !== note} onClick={() => onAdmit(intake, needs, review)}>
                  Add patient to queue <Icon name="arrow" size={18} />
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
