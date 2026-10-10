import type { ComponentProps, ReactNode } from "react";
import type { Level, TaskKind, TaskStatus } from "@/er/types";
import { initials, KIND_GLYPH, KIND_LABEL, LEVEL_NAME, STATUS_TONE, TONE_TEXT, type Tone } from "./format";

export function Micro({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <span className={`micro ${className}`}>{children}</span>;
}

export function LevelTile({ level, size = "md" }: { level: Level; size?: "sm" | "md" | "lg" }) {
  return (
    <span className={`lvl lvl-${level} lvl-${size}`} role="img" aria-label={`Triage level ${level}, ${LEVEL_NAME[level].toLowerCase()}`}>
      {level}
    </span>
  );
}

export function Avatar({ name, size = "md", muted = false }: { name: string; size?: "md" | "lg"; muted?: boolean }) {
  return (
    <span
      aria-hidden
      className={`grid flex-none place-items-center border font-mono font-bold tracking-[0.04em] ${size === "lg" ? "size-12 text-[16px]" : "size-9 text-[12px]"} ${muted ? "border-dashed border-line-strong text-ink-3" : "border-line-strong bg-raised text-ink-2"}`}
    >
      {initials(name) || "?"}
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
  return <span className={`inline-flex h-5 items-center border border-current px-1.5 font-mono text-[10px] font-bold tracking-[0.08em] uppercase ${TONE_TEXT[tone]}`}>{children}</span>;
}

export function AiMark({ children = "AI", className = "" }: { children?: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex h-5 flex-none items-center gap-1 border border-pen px-1.5 font-mono text-[10px] font-bold tracking-[0.08em] whitespace-nowrap text-pen uppercase ${className}`}>
      <span aria-hidden>✦</span>
      {children}
    </span>
  );
}

export function ModeBadge({ mode, cached }: { mode: "ai" | "rules"; cached?: boolean }) {
  if (mode === "rules") return <Badge tone="warn">Rules · AI offline</Badge>;
  return <AiMark>{cached ? "AI · saved answer" : "AI read"}</AiMark>;
}

export function SectionHead({ index, title, aside }: { index?: string; title: ReactNode; aside?: ReactNode }) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-3 border-b border-line px-4">
      <h2 className="flex items-baseline gap-2.5 text-[13px] font-bold tracking-[0.02em]">
        {index && <span className="font-mono text-[11px] text-ink-3">{index}</span>}
        {title}
      </h2>
      {aside && <div className="flex items-center gap-2">{aside}</div>}
    </div>
  );
}
