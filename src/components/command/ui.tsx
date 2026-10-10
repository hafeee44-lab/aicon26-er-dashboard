"use client";

import { useEffect, useRef, type ComponentProps, type ReactNode } from "react";
import type { Level, TaskKind, TaskStatus } from "@/er/types";
import { KIND_GLYPH, KIND_LABEL, STATUS_TONE, TONE_TEXT, type Tone } from "./format";

export function Micro({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <span className={`micro ${className}`}>{children}</span>;
}

export const LEVEL_LABEL = { 1: "Immediate", 2: "Very urgent", 3: "Urgent", 4: "Standard", 5: "Non-urgent" };

export function LevelTile({ level, size = "md" }: { level: Level; size?: "sm" | "md" | "lg" }) {
  return (
    <span className={`lvl lvl-${level} lvl-${size}`} title={`Level ${level}: ${LEVEL_LABEL[level]}`}>
      <span>L{level}</span>{size !== "sm" && <span>{LEVEL_LABEL[level]}</span>}
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
  return <span className={`badge ${TONE_TEXT[tone]}`}>{children}</span>;
}

export function ModeBadge({ mode, cached }: { mode: "ai" | "rules"; cached?: boolean }) {
  if (mode === "rules") return <Badge tone="warn">Rules · AI offline</Badge>;
  return <Badge tone="ok">{cached ? "AI · saved answer" : "AI read"}</Badge>;
}

export function SectionHead({ title, aside }: { index?: string; title: string; aside?: ReactNode }) {
  return (
    <div className="section-head">
      <h2>{title}</h2>
      {aside && <div className="section-aside">{aside}</div>}
    </div>
  );
}

export type IconName = "overview" | "floor" | "rounds" | "evidence" | "plus" | "search" | "arrow" | "clock" | "check" | "alert" | "bed" | "people" | "more" | "moon" | "close";
const ICONS: Record<IconName, ReactNode> = {
  overview: <><rect x="3" y="3" width="7" height="7" rx="2" /><rect x="14" y="3" width="7" height="7" rx="2" /><rect x="3" y="14" width="7" height="7" rx="2" /><rect x="14" y="14" width="7" height="7" rx="2" /></>,
  floor: <><path d="M3 21V3h7v6h11v12Z" /><path d="M3 14h7v7M14 9v6h7" /></>,
  rounds: <><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 3h6v3H9zM9 11l2 2 4-4M9 17h6" /></>,
  evidence: <path d="M4 3v17h17M8 15v-3M13 15V8M18 15V4" />,
  plus: <path d="M12 5v14M5 12h14" />,
  search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></>,
  arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  check: <path d="m5 12 4 4L19 6" />,
  alert: <><path d="m10 4-8 14a2 2 0 0 0 2 3h16a2 2 0 0 0 2-3L14 4a2.3 2.3 0 0 0-4 0Z" /><path d="M12 9v4m0 4h.01" /></>,
  bed: <path d="M3 7v14m18-7v7M3 17h18M7 10h12a2 2 0 0 1 2 2v5M3 10h4v7M6 6h4" />,
  people: <><circle cx="9" cy="7" r="3" /><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 4a3 3 0 0 1 0 6m3 11v-3a6 6 0 0 0-2-4" /></>,
  more: <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>,
  moon: <path d="M20 15A9 9 0 0 1 9 4a9 9 0 1 0 11 11Z" />,
  close: <path d="m6 6 12 12M6 18 18 6" />,
};
export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICONS[name]}</svg>;
}
export function useDialogFocus() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const node = ref.current;
    const getItems = () => Array.from(node?.querySelectorAll<HTMLElement>("button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), summary, a[href], [tabindex='0']") ?? []).filter((el) => el.tabIndex >= 0 && el.getClientRects().length > 0);
    getItems()[0]?.focus();
    function trap(event: KeyboardEvent) {
      if (event.key !== "Tab") return;
      const items = getItems();
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && (document.activeElement === first || !node?.contains(document.activeElement))) { event.preventDefault(); last?.focus(); }
      if (!event.shiftKey && (document.activeElement === last || !node?.contains(document.activeElement))) { event.preventDefault(); first?.focus(); }
    }
    node?.addEventListener("keydown", trap);
    return () => { node?.removeEventListener("keydown", trap); previous?.focus(); };
  }, []);
  return ref;
}
