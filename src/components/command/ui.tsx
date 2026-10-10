import type { ComponentProps, KeyboardEvent, ReactNode } from "react";
import type { Level, TaskKind, TaskStatus } from "@/er/types";
import { KIND_GLYPH, KIND_LABEL, STATUS_TONE, TONE_TEXT, type Tone } from "./format";

const ICONS = {
  overview: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
  floor: "M3 19V5m0 10h18v4m0-4V9H9v6M3 9h6M9 9V5H3",
  rounds: "M9 5H5v16h14V5h-4M9 3h6v4H9z M8 12l2 2 5-4M8 18h8",
  evidence: "M4 20V4m0 16h17M8 16v-5m5 5V7m5 9V3",
  clock: "M12 8v5l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0",
  arrow: "M5 12h14m-6-6 6 6-6 6",
  plus: "M12 5v14M5 12h14",
  chevron: "m9 5 7 7-7 7",
  alert: "M12 8v5m0 3v.1M10 3 2 18a2 2 0 0 0 2 3h16a2 2 0 0 0 2-3L14 3a2 2 0 0 0-4 0",
  people: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.87M13 3a4 4 0 0 1 0 8M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
  check: "m5 12 4 4L19 6",
  spark: "m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3",
  search: "M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0",
  close: "m6 6 12 12M6 18 18 6",
  pulse: "M2 12h4l3-8 6 16 3-8h4",
  sun: "M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
} as const;

export function Icon({ name, size = 20, className = "" }: { name: keyof typeof ICONS; size?: number; className?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true"><path d={ICONS[name]} /></svg>;
}

export const LEVEL_LABEL = { 1: "Immediate", 2: "Very urgent", 3: "Urgent", 4: "Standard", 5: "Non-urgent" } as const;

export function LevelBadge({ level }: { level: Level }) {
  return <span className={`level-badge lvl-${level}`}><span className="level-dot" />L{level}<span>{LEVEL_LABEL[level]}</span></span>;
}

export function trapDialogFocus(event: KeyboardEvent<HTMLElement>) {
  if (event.key !== "Tab") return;
  const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), summary, [tabindex='0']")).filter((item) => item.tabIndex >= 0 && item.getClientRects().length > 0);
  const first = items[0];
  const last = items[items.length - 1];
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
  if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
}

export function Micro({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <span className={`micro ${className}`}>{children}</span>;
}

export function LevelTile({ level, size = "md" }: { level: Level; size?: "sm" | "md" | "lg" }) {
  return (
    <span className={`lvl lvl-${level} lvl-${size}`} role="img" aria-label={`Triage level ${level}`}>
      {level}
    </span>
  );
}

type ButtonProps = ComponentProps<"button"> & { variant?: "line" | "solid" | "alert"; size?: "sm" | "md" | "lg" };

export function Button({ variant = "line", size = "md", className = "", type = "button", ...props }: ButtonProps) {
  const v = variant === "solid" ? "btn-solid" : variant === "alert" ? "btn-alert" : "";
  const s = size === "sm" ? "btn-sm" : size === "lg" ? "btn-lg" : "";
  return <button type={type} className={`btn ${v} ${s} ${className}`} {...props} />;
}

export function Seg<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string; title?: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={String(o.value)} type="button" aria-pressed={o.value === value} title={o.title} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Glyph({ kind, status }: { kind: TaskKind; status?: TaskStatus }) {
  const tone: Tone = status ? STATUS_TONE[status] : "normal";
  return <span className={`glyph ${KIND_GLYPH[kind]} ${TONE_TEXT[tone]}`} role="img" aria-label={KIND_LABEL[kind]} />;
}

export function Badge({ children, tone = "normal" }: { children: ReactNode; tone?: Tone }) {
  return <span className={`inline-flex min-h-6 items-center border border-line px-1.5 text-[13px] font-semibold ${tone === "alert" ? "text-alert" : "text-ink-2"}`}>{children}</span>;
}

export function ModeBadge({ mode, cached }: { mode: "ai" | "rules"; cached?: boolean }) {
  if (mode === "rules") return <Badge tone="warn">Rules · AI offline</Badge>;
  return <Badge tone="ok">{cached ? "AI · saved answer" : "AI read"}</Badge>;
}

export function SectionHead({ index, title, aside }: { index?: string; title: string; aside?: ReactNode }) {
  return (
    <div className="section-head flex min-h-11 items-center justify-between gap-3 border-b border-line px-4">
      <h2 className="flex items-baseline gap-2.5 text-[15px] font-bold">
        {index && <span className="font-mono text-[11px] text-ink-3">{index}</span>}
        {title}
      </h2>
      {aside && <div className="flex items-center gap-2">{aside}</div>}
    </div>
  );
}
