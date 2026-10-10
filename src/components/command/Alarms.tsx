"use client";

import { useRef, useState } from "react";
import type { Action, ActionKind, AdviseResponse, Kpis } from "@/er/types";
import type { Language } from "@/lib/types";
import { Button, ModeBadge, Seg } from "./ui";

const FIX: Record<ActionKind, string> = {
  call_doctor: "Call backup doctor",
  open_overflow: "Open overflow",
  free_beds: "Ask for discharges",
  redirect_minor: "Send to clinic",
  transfer: "Start transfers",
  escalate_tasks: "Escalate overdue care",
};

function Alarm({ action, onApply, primary = false }: { action: Action; onApply: (kind: ActionKind) => void; primary?: boolean }) {
  return <li className={primary ? "primary-alarm" : "secondary-alarm"}><p className="alarm-label">{action.severity === "critical" ? "Urgent action" : "Action needed"}</p><h3>{action.title}</h3><p>{action.detail}</p><div className="alarm-action"><Button variant={primary ? "alert" : "line"} size={primary ? "lg" : "md"} onClick={() => onApply(action.kind)} aria-label={`Escalate: ${FIX[action.kind]}`}>{primary ? "Escalate" : FIX[action.kind]}{primary && <span aria-hidden>→</span>}</Button>{primary && <span>{FIX[action.kind]}</span>}</div></li>;
}

function Brief({ kpis, actions }: { kpis: Kpis; actions: Action[] }) {
  const [language, setLanguage] = useState<Language>("en");
  const [brief, setBrief] = useState<(AdviseResponse & { key: string; language: Language }) | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(false);
  const details = useRef<HTMLDetailsElement>(null);
  const key = actions.map((a) => a.kind).join(",");
  async function write() {
    if (details.current) details.current.open = true;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/advise", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kpis, actions, language }) });
      if (!res.ok) throw new Error("The brief could not be written");
      setBrief({ ...((await res.json()) as AdviseResponse), key, language });
    } catch (e) { setError((e as Error).message); } finally { setLoading(false); }
  }
  return <section className="command-card brief-card"><div className="brief-header"><h2>Charge nurse brief</h2><Button onClick={write} disabled={loading}>{loading ? "Writing…" : "Write brief"}</Button></div><details ref={details} className="calm-details"><summary>AI brief <span>View language and handover</span></summary><div className="brief-body"><Seg<Language> label="Brief language" value={language} onChange={setLanguage} options={[{ value: "en", label: "English" }, { value: "ur", label: "اردو" }]} /><div aria-live="polite" className={loading ? "brief-output scanning" : "brief-output"}>{error && <p className="text-alert">{error}. Try Write brief again.</p>}{!brief && !error && !loading && <p>A short handover based on the current queue and alarms.</p>}{brief && <><div dir={brief.language === "ur" ? "rtl" : "ltr"} className={`brief-copy ${brief.language === "ur" ? "font-urdu" : ""} ${expanded ? "" : "brief-clamped"}`}>{brief.message.split("\n").filter(Boolean).map((line, i) => <p key={`${brief.key}-${i}`}>{line}</p>)}</div><button type="button" className="text-action" onClick={() => setExpanded(!expanded)} aria-expanded={expanded}>{expanded ? "Show less" : "Expand brief"}</button><div className="brief-meta"><ModeBadge mode={brief.meta.mode} cached={brief.meta.cached} />{brief.key !== key && <span>The alarms changed. Write an updated brief.</span>}</div></>}</div></div></details></section>;
}

export function Alarms({ actions, kpis, onApply }: { actions: Action[]; kpis: Kpis; onApply: (kind: ActionKind) => void }) {
  const sorted = [...actions].sort((a, b) => a.severity === b.severity ? 0 : a.severity === "critical" ? -1 : 1);
  return <div className="action-stack"><section aria-labelledby="alarms-title" className={`command-card attention-card ${sorted.length ? "has-problem" : ""}`}><div className="attention-heading"><h2 id="alarms-title">Needs action now</h2><span className="font-mono tnum">{sorted.length}</span></div><ul aria-live="polite">{sorted[0] ? <Alarm action={sorted[0]} onApply={onApply} primary /> : <li className="friendly-empty"><strong>All clear</strong><p>Every patient and task is on time.</p></li>}</ul>{sorted.length > 1 && <details className="calm-details"><summary>{sorted.length - 1} more alarms <span>Review</span></summary><ul>{sorted.slice(1).map((a) => <Alarm key={`${a.kind}-${a.title}`} action={a} onApply={onApply} />)}</ul></details>}</section><Brief kpis={kpis} actions={actions} /></div>;
}
