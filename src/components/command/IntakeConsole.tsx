"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { TARGET_MINUTES, triage } from "@/er/engine";
import { demoNotes, demoSlips } from "@/er/demo-notes";
import type { Consciousness, Intake, IntakeResponse, Needs, Vitals } from "@/er/types";
import { readUpload, toBase64 } from "@/lib/files";
import type { Attachment } from "@/lib/types";
import { DESTINATION_LABEL, dur } from "./format";
import { AiMark, Button, LevelTile, Micro, ModeBadge, Seg } from "./ui";

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
type Photo = { attachment: Attachment; label: string; preview: string | null };

const FIELDS: { key: keyof Vitals; label: string; color: string; step?: string }[] = [
  { key: "hr", label: "HR", color: "text-hr" },
  { key: "sbp", label: "SYS", color: "text-bp" },
  { key: "dbp", label: "DIA", color: "text-bp" },
  { key: "spo2", label: "SpO₂", color: "text-spo2" },
  { key: "rr", label: "RR", color: "text-rr" },
  { key: "temp", label: "TEMP", color: "text-temp", step: "0.1" },
  { key: "pain", label: "PAIN", color: "text-ink" },
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
    const re = new RegExp(`(?<![\\d./:])${w.needle.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")}(?![\\d])`, "g");
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
  const [note, setNote] = useState("");
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [read, setRead] = useState<{ note: string; photo: Photo | null; response: IntakeResponse } | null>(null);
  const [intake, setIntake] = useState<Intake | null>(null);
  const [needs, setNeeds] = useState<Needs | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [listening, setListening] = useState(false);
  const boxRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    boxRef.current?.focus();
  }, []);

  async function submit(text = note, attached = photo) {
    if (!text.trim() && !attached) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/intake", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ note: text, files: attached ? [attached.attachment] : [] }),
      });
      const body = (await res.json()) as IntakeResponse & { error?: string };
      if (!res.ok) throw new Error(body.error || "The note could not be read");
      setRead({ note: body.intake.note || text, photo: attached, response: body });
      setIntake({ ...body.intake, name: /^unknown$/i.test(body.intake.name.trim()) ? "" : body.intake.name });
      setNeeds(body.needs);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function sample(slip: (typeof demoSlips)[number]) {
    try {
      const res = await fetch(slip.src);
      if (!res.ok) throw new Error("The sample photo could not be loaded");
      const attached = { attachment: { mimeType: slip.mimeType, data: await toBase64(await res.blob()) }, label: slip.label, preview: slip.src };
      setPhoto(attached);
      setNote("");
      await submit("", attached);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function attach(f: File | undefined) {
    if (!f) return;
    setError("");
    try {
      const { attachment, preview } = await readUpload(f);
      setPhoto({ attachment, label: f.name, preview });
    } catch {
      setError("That file could not be opened. Use a JPG, PNG or PDF (iPhone HEIC photos: take a screenshot instead).");
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
    <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/60 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="intake-title">
      <div className="grid max-h-full w-full max-w-[1120px] overflow-y-auto border border-line-strong bg-bg lg:grid-cols-[1fr_1.05fr] lg:overflow-hidden">
        <div className="thin-scroll flex flex-col border-b border-line lg:max-h-[86vh] lg:overflow-y-auto lg:border-r lg:border-b-0">
          <div className="flex h-14 items-center justify-between gap-3 border-b border-line px-5">
            <h2 id="intake-title" className="flex min-w-0 items-center gap-2.5 text-[15px] font-bold">
              New arrival
              <AiMark>
                <span className="hidden sm:inline">AI reads notes and photos</span>
                <span className="sm:hidden">AI</span>
              </AiMark>
            </h2>
            <Button size="sm" onClick={onClose} aria-keyshortcuts="Escape">
              Close
            </Button>
          </div>
          <div className="flex flex-1 flex-col gap-4 p-5">
            <div>
              <Micro>Try a demo note · English, Roman Urdu, Urdu</Micro>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {demoNotes.map((n, i) => (
                  <button
                    key={n}
                    type="button"
                    disabled={loading}
                    className={`btn btn-sm ${LABELS[i]?.startsWith("اردو") ? "font-urdu" : ""}`}
                    onClick={() => {
                      setNote(n);
                      setPhoto(null);
                      submit(n, null);
                    }}
                  >
                    {LABELS[i] ?? n.slice(0, 24)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Micro>Or a photo of a handwritten note · synthetic</Micro>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {demoSlips.map((slip) => (
                  <button
                    key={slip.src}
                    type="button"
                    disabled={loading}
                    onClick={() => sample(slip)}
                    className={`group border text-left hover:border-ink-3 ${photo?.preview === slip.src ? "border-pen" : "border-line"}`}
                  >
                    <img src={slip.src} alt="" className="h-16 w-full object-cover object-top opacity-90 group-hover:opacity-100" />
                    <span className="block px-2 py-1.5 text-[12px] leading-tight text-ink-2">{slip.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <label htmlFor="intake-note" className="sr-only">
              Nurse note
            </label>
            <textarea
              id="intake-note"
              ref={boxRef}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
              }}
              rows={4}
              dir="auto"
              placeholder={photo ? "Add anything the photo does not say (optional)" : "67 saal mard, seene mein dard aur paseena, BP 88/60, pulse 112, sat 94"}
              className="ruled w-full resize-none border border-line bg-raised px-4 py-1 font-mono text-[17px] leading-[28px] outline-none focus:border-ink-3"
            />
            {photo && (
              <div className="flex items-center gap-3 border border-pen/60 bg-raised p-2">
                {photo.preview ? (
                  <img src={photo.preview} alt="" className="h-12 w-16 flex-none border border-line object-cover object-top" />
                ) : (
                  <span className="grid h-12 w-16 flex-none place-items-center border border-line font-mono text-[11px] text-ink-3">PDF</span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-bold">{photo.label}</span>
                  <span className="block text-[12px] text-ink-3">The AI reads this with anything you type</span>
                </span>
                <Button size="sm" onClick={() => setPhoto(null)} disabled={loading} aria-label="Remove the attached photo">
                  Remove
                </Button>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="solid" size="lg" onClick={() => submit()} disabled={loading || (!note.trim() && !photo)}>
                <span aria-hidden>✦</span>
                {loading ? "Reading…" : "Read with AI"}
                <kbd className="font-mono text-[10px] opacity-60">⌘↵</kbd>
              </Button>
              <label className={`btn has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ink ${loading ? "pointer-events-none opacity-50" : ""}`}>
                Attach photo or PDF
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  className="sr-only"
                  onChange={(e) => {
                    attach(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
              </label>
              <Button onClick={dictate} disabled={listening}>
                {listening ? "Listening…" : "Dictate"}
              </Button>
            </div>
            {error && <p className="text-[13px] text-alert">{error}</p>}
            {read && intake && (
              <div className="border-t border-line pt-4">
                <div className="flex items-center gap-2">
                  <Micro>{read.photo ? "What the AI read from the photo" : "What the AI took from the note"}</Micro>
                  <AiMark />
                </div>
                <div className="mt-2 flex items-start gap-3">
                  {read.photo?.preview && <img src={read.photo.preview} alt={`The attached photo: ${read.photo.label}`} className="h-28 w-24 flex-none border border-line object-cover object-top" />}
                  <Highlighted note={read.note} intake={intake} />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className={`thin-scroll flex flex-col lg:max-h-[86vh] lg:overflow-y-auto ${loading ? "scanning" : ""}`}>
          {!result || !intake || !needs ? (
            <div className="flex flex-1 flex-col justify-center gap-5 p-8">
              {[
                ["01", "The AI reads the note or photo", "Typed, dictated or photographed, in English, Urdu or Roman Urdu: vitals, complaint and likely needs. Anything it had to guess is marked for you to check."],
                ["02", "Code sets the level", "An ESI checklist decides levels 1 to 5. The AI can only raise priority, never lower it."],
                ["03", "You admit", "The patient joins the board with a due time: L1 now, L2 15 min, L3 30, L4 60, L5 120."],
              ].map(([n, t, b]) => (
                <div key={n} className="grid grid-cols-[32px_1fr] gap-3">
                  <span className="font-mono text-[12px] text-ink-3">{n}</span>
                  <div>
                    <div className="flex flex-wrap items-center gap-2 font-bold">
                      {t}
                      {n === "01" && <AiMark />}
                    </div>
                    <p className="mt-0.5 text-[13px] text-ink-2">{b}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className="flex items-start gap-4 border-b border-line p-5">
                <LevelTile level={result.level} size="lg" />
                <div className="min-w-0 flex-1">
                  <div className="text-[22px] leading-tight font-bold">Level {result.level}</div>
                  <div className="font-mono text-[12px] text-ink-2">See a doctor {TARGET_MINUTES[result.level] === 0 ? "now" : `within ${dur(TARGET_MINUTES[result.level])}`}</div>
                  <ul className="mt-2 space-y-1 text-[13px]">
                    {(result.flags.length ? result.flags : [`No danger signs · ${needs.resources.length} likely need${needs.resources.length === 1 ? "" : "s"}`]).map((f) => (
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

              <div className="grid grid-cols-4 gap-px border-b border-line bg-line sm:grid-cols-8">
                {FIELDS.map((f) => {
                  const check = review.includes(f.key);
                  return (
                    <label key={f.key} className={`bg-bg px-2.5 py-2 ${check ? "outline-2 -outline-offset-2 outline-warn" : ""}`}>
                      <span className={`font-mono text-[10px] font-bold ${check ? "text-warn" : f.color}`}>
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
                        placeholder="—"
                      />
                    </label>
                  );
                })}
                <label className="bg-bg px-2.5 py-2">
                  <span className="font-mono text-[10px] font-bold text-ink">AVPU</span>
                  <select value={intake.vitals.consciousness ?? ""} onChange={(e) => setVital("consciousness", e.target.value)} className="mt-1 w-full bg-transparent font-mono text-[12px] font-bold outline-none" aria-label="Consciousness">
                    <option value="">—</option>
                    <option value="alert">Alert</option>
                    <option value="voice">Voice</option>
                    <option value="pain">Pain</option>
                    <option value="unresponsive">None</option>
                  </select>
                </label>
              </div>

              <div className="border-b border-line p-5 text-[13px]">
                <div className="flex flex-wrap items-center gap-2">
                  <Micro>Predicted needs · not a diagnosis</Micro>
                  <AiMark>AI prediction</AiMark>
                </div>
                <p className="mt-1.5 text-ink-2">
                  <span className="text-ink capitalize">{needs.specialty}</span> · {needs.resources.join(", ").replaceAll("_", " ") || "examination only"} · likely {DESTINATION_LABEL[needs.destination].toLowerCase()}
                  {needs.highRisk && <span className="font-bold text-alert"> · high risk</span>}
                </p>
                {needs.reason && <p className="mt-1.5 text-ink-3">{needs.reason}</p>}
                <label className="mt-3 flex items-center gap-2 text-ink-2">
                  <input type="checkbox" checked={needs.highRisk} onChange={(e) => setNeeds({ ...needs, highRisk: e.target.checked })} />
                  High-risk situation, as judged by the AI (raises the level, never lowers it)
                </label>
              </div>

              <div className="mt-auto flex items-center justify-between gap-3 p-5">
                <span className="text-[12px] text-ink-3">{review.length ? `Check ${review.length} field${review.length > 1 ? "s" : ""} the AI was unsure about` : "Nothing flagged for checking"}</span>
                <Button variant="solid" size="lg" onClick={() => onAdmit(intake, needs, review)}>
                  Admit · level {result.level}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
