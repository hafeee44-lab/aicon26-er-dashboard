"use client";

import type { Policy } from "@/er/types";
import { at } from "./format";
import { Button, Seg } from "./ui";
import type { Command, Speed } from "./useCommand";

export type View = "command" | "floor" | "rounds" | "evidence";
export const VIEWS: { id: View; label: string; key: string }[] = [
  { id: "command", label: "Command", key: "1" },
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
  return <div className="command-brand"><span className="brand-cross" aria-hidden>+</span><div><strong>ER Command</strong><span>Nothing gets missed</span></div></div>;
}

export function Nav({ view, onView, className = "" }: { view: View; onView: (v: View) => void; className?: string }) {
  return <nav aria-label="Views" className={`command-nav ${className}`}>{VIEWS.map((v) => <button key={v.id} type="button" onClick={() => onView(v.id)} aria-current={view === v.id ? "page" : undefined} title={`${v.label} (${v.key})`} className={view === v.id ? "is-current" : ""}>{v.label}</button>)}</nav>;
}

export function TopBar({ cmd, view, onView, onNew }: { cmd: Command; view: View; onView: (v: View) => void; onNew: () => void }) {
  return <header className="command-header">
    <div className="command-header-main"><Brand /><Nav view={view} onView={onView} className="desktop-nav" /><Button variant="solid" onClick={onNew} aria-label="New arrival (N)" aria-keyshortcuts="n">New arrival <kbd>N</kbd></Button></div>
    <div className="shift-toolbar">
      <div className="shift-clock"><span>Shift time</span><strong className="font-mono tnum" aria-label={`Shift time ${at(cmd.dept.now)}`}>{at(cmd.dept.now)}</strong></div>
      <div className="clock-controls"><Button onClick={cmd.togglePlaying} aria-label={cmd.playing ? "Pause the clock" : "Run the clock"} aria-keyshortcuts="Space">{cmd.playing ? "Pause" : "Run"}<span className="run-symbol" aria-hidden>{cmd.playing ? "Ⅱ" : "▶"}</span></Button><Seg<Speed> label="Clock speed, simulated minutes per second" value={cmd.speed} onChange={cmd.setSpeed} options={[{ value: 1, label: "×1" }, { value: 5, label: "×5" }, { value: 15, label: "×15" }]} /></div>
      <div className="queue-policy"><div><span>Who goes first</span><Seg<Policy> label="Who goes first" value={cmd.dept.policy} onChange={cmd.changePolicy} options={[{ value: "smart", label: "Smart" }, { value: "first_come", label: "First come" }]} /></div><p>Smart = sickest first, First come = arrival order</p></div>
      <details className="demo-tools"><summary aria-label="Open demo tools">Demo tools <span aria-hidden>⌄</span></summary><div className="demo-popover"><p>Shape the demo</p><Button onClick={() => cmd.surge("demo")}>Inject surge · Demo cases</Button><Button onClick={() => cmd.surge("real")}>Inject surge · Real visits</Button><Button onClick={toggleTheme} aria-label="Switch between monitor and paper themes"><span className="when-monitor">Switch to Paper</span><span className="when-paper">Switch to Monitor</span></Button><Button onClick={cmd.reset}>Reset the shift</Button></div></details>
    </div>
  </header>;
}
