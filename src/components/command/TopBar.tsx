"use client";

import type { Policy } from "@/er/types";
import { at } from "./format";
import { Button, Icon, Seg, type IconName } from "./ui";
import { MINUTES_PER_SECOND, type Command } from "./useCommand";

export type View = "command" | "floor" | "rounds" | "evidence";
export const VIEWS: { id: View; label: string; key: string; icon: IconName }[] = [
  { id: "command", label: "Overview", key: "1", icon: "overview" },
  { id: "floor", label: "Department", key: "2", icon: "floor" },
  { id: "rounds", label: "Care rounds", key: "3", icon: "rounds" },
  { id: "evidence", label: "Evidence", key: "4", icon: "evidence" },
];

function toggleTheme() {
  const root = document.documentElement;
  const next = root.dataset.theme === "paper" ? "monitor" : "paper";
  root.dataset.theme = next;
  try { localStorage.setItem("erc-care-theme", next); } catch {}
}

export function Brand() {
  return <div className="brand"><span className="brand-mark"><svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true"><path d="M12 3h8v9h9v8h-9v9h-8v-9H3v-8h9z" fill="currentColor" /><path d="m10 16 4 4 8-9" fill="none" stroke="var(--accent)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg></span><div><strong>ER Command<span className="brand-period">.</span></strong><small>Every patient. Every step.</small></div></div>;
}

export function Nav({ view, onView, className = "" }: { view: View; onView: (v: View) => void; className?: string }) {
  return <nav aria-label="Main navigation" className={`app-nav ${className}`}>{VIEWS.map((v) => <button key={v.id} type="button" onClick={() => onView(v.id)} aria-current={view === v.id ? "page" : undefined} title={`${v.label} (${v.key})`} aria-keyshortcuts={v.key}><Icon name={v.icon} /><span>{v.label}</span></button>)}</nav>;
}

export function TopBar({ cmd, view, onView, onNew }: { cmd: Command; view: View; onView: (v: View) => void; onNew: () => void }) {
  return <header className="app-header">
    <div className="header-inner"><Brand /><Nav view={view} onView={onView} className="desktop-nav" /><div className="header-actions"><span className="demo-indicator"><span /> Simulation</span><Button variant="solid" onClick={onNew} aria-keyshortcuts="n" title="New arrival (N)"><Icon name="plus" /><span>New arrival</span></Button></div></div>
    <div className="simulation-toolbar"><div className="toolbar-inner">
      <div className="clock-control"><Icon name="clock" /><strong className="tnum" aria-label={`Shift time ${at(cmd.dept.now)}`}>{at(cmd.dept.now)}</strong><Button onClick={cmd.togglePlaying} aria-keyshortcuts="Space" title="Run or pause (Space)" aria-label={cmd.playing ? "Pause simulation" : "Run simulation"}><span aria-hidden="true">{cmd.playing ? "Ⅱ" : "▶"}</span>{cmd.playing ? "Pause" : "Run"}</Button><span className="clock-caption">{cmd.playing ? "Running" : "Paused"} · 1 second = {MINUTES_PER_SECOND} minutes</span></div>
      <div className="policy-control"><span>Who goes first?</span><Seg<Policy> label="Patient allocation order" value={cmd.dept.policy} onChange={cmd.changePolicy} options={[{ value: "smart", label: "Sickest first" }, { value: "first_come", label: "Arrival order" }]} /></div>
      <details className="tools-menu"><summary><Icon name="more" /><span>Demo tools</span></summary><div className="tools-popover"><strong>Explore a busy shift</strong><p>Add 15 arrivals to compare queue behaviour.</p><Button onClick={() => cmd.surge("demo")}>Add demo patients</Button><Button onClick={() => cmd.surge("real")}>Replay real visits</Button><Button onClick={toggleTheme}><Icon name="moon" />Switch light / dark</Button><Button onClick={() => { if (window.confirm("Reset this simulated shift? Current changes will be cleared.")) cmd.reset(); }}>Reset shift</Button><small>N new arrival · Space run<br />1–4 switch views · Esc close</small></div></details>
    </div></div>
  </header>;
}
