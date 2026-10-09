import { UI_COPY } from "@/er/uiCopy";
import type { Kpis } from "@/er/types";
import type { UiLanguage } from "@/er/uiPreferences";

export function KpiGrid({ kpis, language }: { kpis: Kpis; language: UiLanguage }) {
  const copy = UI_COPY[language];
  const bedsFree = kpis.bedsFree.resus + kpis.bedsFree.acute + kpis.bedsFree.fasttrack;
  const bedsTotal = kpis.bedsTotal.resus + kpis.bedsTotal.acute + kpis.bedsTotal.fasttrack;
  const cards = [
    { label: copy.waiting, value: kpis.waiting, detail: `${kpis.criticalWaiting} ${copy.critical.toLowerCase()}`, danger: kpis.criticalWaiting > 0 },
    { label: copy.longestWait, value: `${kpis.longestWait}m`, detail: `${copy.averageWait}: ${kpis.avgWait}m`, danger: kpis.longestWait >= 60 },
    { label: copy.bedsFree, value: `${bedsFree}/${bedsTotal}`, detail: `${kpis.corridor} ${copy.corridor.toLowerCase()}`, danger: bedsFree === 0 },
    { label: copy.doctorsBusy, value: `${kpis.doctorsBusy}/${kpis.doctorsOnShift}`, detail: `${kpis.boarding} ${copy.boarding.toLowerCase()}`, danger: kpis.doctorsBusy === kpis.doctorsOnShift },
  ];
  return (
    <section id="overview" aria-label={copy.overview}>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {cards.map((card) => (
          <article key={card.label} className="relative overflow-hidden rounded-2xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-[#171717]">
            <span className={`absolute inset-y-0 left-0 w-1 ${card.danger ? "bg-red-500" : "bg-[#353A96]"}`} />
            <p className="text-[10px] font-bold tracking-[0.12em] text-black/40 uppercase dark:text-white/40">{card.label}</p>
            <div className="mt-2 flex items-end justify-between gap-2">
              <p className="text-xl font-bold tracking-tight tabular-nums text-black dark:text-white sm:text-2xl">{card.value}</p>
              <p className={`pb-1 text-right text-[9px] font-semibold sm:text-[10px] ${card.danger ? "text-red-600 dark:text-red-400" : "text-black/45 dark:text-white/45"}`}>{card.detail}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
