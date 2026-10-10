"use client";

import type { Policy } from "@/er/types";
import { at } from "./format";
import { Button, Micro, Seg } from "./ui";
import type { Command, Speed } from "./useCommand";

export type View = "command" | "floor" | "rounds" | "evidence";

export const VIEWS: { id: View; label: string; key: string }[] = [
  { id: "command", label: "Command", key: "1" },
  { id: "floor", label: "Floor", key: "2" },
  { id: "rounds", label: "Rounds", key: "3" },
  { id: "evidence", label: "Evidence", key: "4" },
];

const BEAT = "M0 15 L13 15 Q16.5 10 20 15 L24 15 L26 18 L29 3 L32 22 L34.5 15 L40 15 Q45 8.5 50 15 L60 15";
const SHIFT_START = 0;
const SHIFT_LENGTH = 12 * 60;

function Ecg() {
  return (
    <svg width="96" height="26" viewBox="0 0 96 26" aria-hidden className="overflow-hidden text-hr">
      <g className="ecg-track">
        {[0, 60, 120].map((x) => (
          <path key={x} d={BEAT} transform={`translate(${x} 0)`} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        ))}
      </g>
    </svg>
  );
}

function PlayIcon({ playing }: { playing: boolean }) {
  return playing ? (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
      <rect x="2" y="1" width="3" height="10" fill="currentColor" />
      <rect x="7" y="1" width="3" height="10" fill="currentColor" />
    </svg>
  ) : (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
      <path d="M2.5 1 L10.5 6 L2.5 11 Z" fill="currentColor" />
    </svg>
  );
}

function toggleTheme() {
  const root = document.documentElement;
  const next = root.dataset.theme === "paper" ? "monitor" : "paper";
  root.dataset.theme = next;
  try {
    localStorage.setItem("erc-theme", next);
  } catch {}
}

export function Brand() {
  return (
    <div className="flex flex-none items-center gap-3 whitespace-nowrap">
      <span className="tick-dot block size-2.5 rounded-full bg-alert" aria-hidden />
      <div className="leading-none">
        <div className="font-mono text-[15px] font-extrabold tracking-[0.14em]">ER COMMAND</div>
        <div className="mt-1 hidden text-[11px] text-ink-3 sm:block">Nothing gets missed</div>
      </div>
      <span className="hidden xl:block">
        <Ecg />
      </span>
    </div>
  );
}

export function Nav({ view, onView, className = "" }: { view: View; onView: (v: View) => void; className?: string }) {
  return (
    <nav aria-label="Views" className={className}>
      {VIEWS.map((v) => (
        <button
          key={v.id}
          type="button"
          onClick={() => onView(v.id)}
          aria-current={view === v.id ? "page" : undefined}
          className={`relative flex h-full items-center justify-center gap-2 px-3 text-[13px] font-bold tracking-[0.02em] transition-colors ${view === v.id ? "text-ink" : "text-ink-3 hover:text-ink"}`}
        >
          <span className="hidden font-mono text-[10px] text-ink-3 lg:inline">{v.key}</span>
          {v.label}
          {view === v.id && <span className="absolute inset-x-3 bottom-0 h-0.5 bg-ink" />}
        </button>
      ))}
    </nav>
  );
}

export function TopBar({ cmd, view, onView, onNew }: { cmd: Command; view: View; onView: (v: View) => void; onNew: () => void }) {
  const { dept, playing } = cmd;
  const progress = Math.min(1, Math.max(0, (dept.now - SHIFT_START) / SHIFT_LENGTH));

  return (
    <header className={`z-30 border-b border-line bg-bg lg:sticky lg:top-0 ${playing ? "ecg-live" : ""}`}>
      <div className="flex h-14 items-center gap-6 border-b border-line px-4 lg:px-6">
        <Brand />
        <Nav view={view} onView={onView} className="hidden h-full items-stretch lg:flex" />
        <div className="ml-auto flex items-center gap-2">
          <button type="button" onClick={toggleTheme} className="btn btn-sm" aria-label="Switch between monitor and paper themes">
            <span className="when-monitor">Paper</span>
            <span className="when-paper">Monitor</span>
          </button>
          <Button variant="solid" onClick={onNew} aria-keyshortcuts="n">
            New arrival <kbd className="hidden font-mono text-[10px] opacity-60 sm:inline">N</kbd>
          </Button>
        </div>
      </div>

      <div className="scroll-x flex min-h-[70px] items-center gap-x-4 gap-y-3 bg-panel px-4 py-3 md:flex-wrap md:overflow-visible xl:gap-x-5 xl:px-6">
        <div className="flex flex-none items-center gap-3">
          <div className="font-mono text-[40px] leading-none font-bold tracking-tight tnum" aria-label={`Shift time ${at(dept.now)}`}>
            {at(dept.now)}
          </div>
          <div className="w-24 whitespace-nowrap">
            <span aria-live="polite">
            {playing ? (
              <span className="micro flex items-center gap-1.5 text-alert!">
                <span className="tick-dot size-1.5 rounded-full bg-alert" aria-hidden />
                Live ×{cmd.speed}
              </span>
            ) : (
              <Micro>Paused</Micro>
            )}
            </span>
            <div className="relative mt-1.5 h-1 bg-line" role="img" aria-label={`Shift ${Math.round(progress * 100)}% through, 08:00 to 20:00`}>
              <div className="absolute inset-y-0 left-0 bg-ink-2" style={{ width: `${progress * 100}%` }} />
            </div>
            <span className="mt-1 block font-mono text-[10px] text-ink-3">08:00 → 20:00</span>
          </div>
        </div>

        <div className="flex flex-none items-center gap-2">
          <Button onClick={cmd.togglePlaying} aria-label={playing ? "Pause the clock" : "Start the clock"} aria-keyshortcuts="Space" className="w-[92px]">
            <PlayIcon playing={playing} />
            {playing ? "Pause" : "Run"}
          </Button>
          <Seg<Speed>
            label="Clock speed, simulated minutes per second"
            value={cmd.speed}
            onChange={cmd.setSpeed}
            options={[
              { value: 1, label: "×1" },
              { value: 5, label: "×5" },
              { value: 15, label: "×15" },
            ]}
          />
          <Button size="sm" onClick={cmd.reset} aria-label="Reset the shift">
            Reset
          </Button>
        </div>

        <div className="hidden h-9 w-px flex-none bg-line xl:block" />

        <div className="flex flex-none items-center gap-3">
          <div>
            <Micro>Who goes first</Micro>
            <div className="mt-1">
              <Seg<Policy>
                label="Allocation policy"
                value={dept.policy}
                onChange={cmd.changePolicy}
                options={[
                  { value: "first_come", label: "First come" },
                  { value: "smart", label: "Smart" },
                ]}
              />
            </div>
          </div>
          <p className="hidden max-w-[150px] text-[11px] leading-snug text-ink-3 xl:block">
            {dept.policy === "smart" ? "Urgency, wait and specialty decide beds and doctors." : "Arrival order. Any free bed, any free doctor."}
          </p>
        </div>

        <div className="flex flex-none items-center gap-3 md:ml-auto">
          <div>
            <Micro>Inject a surge · 15 arrivals</Micro>
            <div className="mt-1 flex gap-1.5">
              <Button size="sm" onClick={() => cmd.surge("demo")}>
                Demo cases
              </Button>
              <Button size="sm" onClick={() => cmd.surge("real")}>
                Real visits
              </Button>
            </div>
          </div>
          <p className="hidden font-mono text-[10px] leading-relaxed text-ink-3 2xl:block">
            N new arrival
            <br />
            Space run · 1–4 views
          </p>
        </div>
      </div>
    </header>
  );
}
