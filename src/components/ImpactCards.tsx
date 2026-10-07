import type { Metric } from "@/domains";

export function ImpactCards({ metrics }: { metrics: Metric[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((m, i) => (
        <div
          key={m.label}
          className={
            i === 0
              ? "rounded-2xl bg-brand p-5 text-white shadow-sm"
              : "rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
          }
        >
          <p className={`text-xs font-semibold tracking-wide uppercase ${i === 0 ? "text-white/80" : "text-zinc-500"}`}>
            {m.label}
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{m.value}</p>
          <p className={`mt-1 text-xs ${i === 0 ? "text-white/80" : "text-zinc-500"}`}>{m.hint}</p>
        </div>
      ))}
    </div>
  );
}
