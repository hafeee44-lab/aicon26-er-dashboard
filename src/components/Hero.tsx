import type { Domain } from "@/domains";

const FLOW = ["Data in", "AI in the loop", "Impact out"];

export function Hero({ domain }: { domain: Domain }) {
  return (
    <section className="mx-auto max-w-7xl px-4 pt-10 pb-8 sm:px-6">
      <p className="text-sm font-semibold text-brand">
        SDG {domain.sdg.number} · {domain.sdg.title}
      </p>
      <h1 className="mt-2 max-w-3xl text-3xl font-bold tracking-tight text-balance sm:text-4xl">{domain.tagline}</h1>
      <p className="mt-3 max-w-2xl text-zinc-600">{domain.problem}</p>

      <ol className="mt-6 flex flex-wrap items-center gap-2 text-sm">
        {FLOW.map((step, i) => (
          <li key={step} className="flex items-center gap-2">
            <span className="rounded-full bg-brand/10 px-3 py-1 font-medium text-brand">
              {i + 1}. {step}
            </span>
            {i < FLOW.length - 1 && <span className="text-zinc-400">→</span>}
          </li>
        ))}
      </ol>
    </section>
  );
}
