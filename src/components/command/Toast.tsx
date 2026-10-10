import { at } from "./format";
import type { LogEntry } from "./useCommand";

export function Toast({ entry, onClose }: { entry: LogEntry; onClose: () => void }) {
  const bar = entry.tone === "alert" ? "bg-alert" : entry.tone === "ok" ? "bg-ok" : "bg-ink-3";
  return (
    <div role="status" className="toast-message fixed right-4 bottom-24 z-40 flex max-w-[min(440px,calc(100vw-2rem))] border border-line-strong bg-panel lg:right-6 lg:bottom-6">
      <span className={`w-1 flex-none ${bar}`} aria-hidden />
      <div className="flex items-start gap-3 py-3 pr-2 pl-4">
        <span className="pt-px font-mono text-[11px] text-ink-3 tnum">{at(entry.at)}</span>
        <span className="text-[13px] leading-snug">{entry.text}</span>
        <button type="button" onClick={onClose} aria-label="Dismiss" className="-mt-1 grid size-11 flex-none place-items-center text-[18px] leading-none text-ink-3 hover:text-ink">
          ×
        </button>
      </div>
    </div>
  );
}
