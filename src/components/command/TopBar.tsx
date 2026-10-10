"use client";

import type { Policy } from "@/er/types";
import { at } from "./format";
import { Button, Icon, Seg } from "./ui";
import type { Command, Speed } from "./useCommand";

export type View = "command" | "floor" | "rounds" | "evidence";
export const VIEWS: { id: View; label: string; key: string }[] = [
  { id: "command", label: "Overview", key: "1" },
  { id: "floor", label: "Floor", key: "2" },
  { id: "rounds", label: "Rounds", key: "3" },
  { id: "evidence", label: "Evidence", key: "4" },
];

function toggleTheme() {
  const root = document.documentElement;
  const next = root.dataset.theme === "paper" ? "monitor" : "paper";
  root.dataset.theme = next;
  try { localStorage.setItem("erc-theme", next); } catch {}
}

export function Brand() {
  return <div className="command-brand"><svg className="brand-mark" viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="18" fill="currentColor" /><path d="M43 18H23v28h20M23 32h13" fill="none" stroke="var(--inverse)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" /><circle cx="43" cy="32" r="4" fill="var(--alert)" /></svg><div><strong>ER Command<span className="brand-period">.</span></strong><span>Clarity. Care. Control.</span></div></div>;
}

export function Nav({ view, onView, className = "" }: { view: View; onView: (v: View) => void; className?: string }) {
  return <nav aria-label="Workspace" className={`command-nav ${className}`}>{VIEWS.map((v) => <button key={v.id} type="button" onClick={() => onView(v.id)} aria-current={view === v.id ? "page" : undefined} title={`${v.label} (${v.key})`} className={view === v.id ? "is-current" : ""}><Icon name={v.id === "command" ? "overview" : v.id} size={18} /><span>{v.label}</span></button>)}</nav>;
}

export function TopBar({ cmd, view, onView, onNew }: { cmd: Command; view: View; onView: (v: View) => void; onNew: () => void }) {
  return <header className="command-header">
    <div className="command-header-main"><Brand /><Nav view={view} onView={onView} className="desktop-nav" /><div className="header-actions"><span className="simulation-label"><span />Simulated shift</span><button type="button" className="icon-button theme-button" onClick={toggleTheme} aria-label="Switch light or dark theme" title="Switch theme"><Icon name="sun" /></button><Button variant="solid" onClick={onNew} aria-label="New arrival (N)" aria-keyshortcuts="n"><Icon name="plus" size={18} />New arrival <kbd>N</kbd></Button></div></div>
    <div className="shift-toolbar">
      <div className="clock-controls"><div className="shift-clock"><Icon name="clock" size={18} /><strong className="font-mono tnum">{at(cmd.dept.now)}</strong><span>Shift time</span></div><Button onClick={cmd.togglePlaying} aria-label={cmd.playing ? "Pause the clock" : "Run the clock"} aria-keyshortcuts="Space"><span aria-hidden>{cmd.playing ? "Ⅱ" : "▶"}</span>{cmd.playing ? "Pause" : "Run"}</Button><Seg<Speed> label="Simulation speed" value={cmd.speed} onChange={cmd.setSpeed} options={[{ value: 1, label: "×1" }, { value: 5, label: "×5" }, { value: 15, label: "×15" }]} /></div>
      <div className="queue-policy"><span>Who goes first</span><Seg<Policy> label="Who goes first" value={cmd.dept.policy} onChange={cmd.changePolicy} options={[{ value: "smart", label: "Smart" }, { value: "first_come", label: "First come" }]} /><p>{cmd.dept.policy === "smart" ? "Sickest patients first" : "In arrival order"}</p></div>
      <details className="demo-tools"><summary aria-label="Open demo tools"><span className="tools-dots" aria-hidden>···</span>Demo tools</summary><div className="demo-popover"><p>Simulation controls</p><Button onClick={() => cmd.surge("demo")}>Add surge · Demo cases</Button><Button onClick={() => cmd.surge("real")}>Add surge · Real visits</Button><Button onClick={toggleTheme}><span className="when-monitor">Switch to light</span><span className="when-paper">Switch to dark</span></Button><Button onClick={cmd.reset}>Reset the shift</Button></div></details>
    </div>
  </header>;
}
