import { LEVELS } from "@/er/engine";
import { evidence } from "@/er/evidence";
import type { ReactNode } from "react";
import { LevelTile, Micro } from "./ui";

function Dots({ total, marked, tone, label, value, caption }: { total: number; marked: number; tone: "alert" | "ok" | "l1"; label: string; value: string; caption: string }) {
  const color = tone === "alert" ? "bg-alert" : tone === "ok" ? "bg-ok" : "bg-l1";
  return (
    <figure className="min-w-0">
      <div className="flex flex-wrap gap-[5px]" role="img" aria-label={`${label}: ${value}`}>
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className={`size-[11px] rounded-full ${i >= total - marked ? color : "bg-line-strong"}`} />
        ))}
      </div>
      <figcaption className="mt-4">
        <div className="micro">{label}</div>
        <div className="mt-1 font-mono text-[44px] leading-none font-bold tnum">{value}</div>
        <p className="mt-2 text-[13px] text-ink-2">{caption}</p>
      </figcaption>
    </figure>
  );
}

function Chapter({ n, title, lead, children }: { n: string; title: string; lead: string; children: ReactNode }) {
  return (
    <section className="grid gap-8 border-t border-line py-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-14">
      <div>
        <span className="font-mono text-[12px] text-ink-3">{n}</span>
        <h2 className="mt-2 text-[30px] leading-[1.1] font-bold tracking-[-0.01em] sm:text-[38px]">{title}</h2>
        <p className="mt-4 max-w-[46ch] text-[16px] leading-relaxed text-ink-2">{lead}</p>
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

function Slope() {
  const shifts = evidence.shifts;
  const max = Math.max(...shifts.map((s) => s.firstCome.urgentWait.avg), 1);
  const y = (v: number) => 30 + (1 - v / max) * 190;
  return (
    <svg viewBox="0 0 560 260" className="w-full" role="img" aria-label="Average wait for urgent patients, first come versus smart">
      {[0, 10, 20, 30, 40].filter((t) => t <= max + 2).map((t) => (
        <g key={t}>
          <line x1="60" x2="500" y1={y(t)} y2={y(t)} stroke="var(--line)" />
          <text x="48" y={y(t) + 4} textAnchor="end" className="fill-ink-3 font-mono text-[11px]">
            {t}m
          </text>
        </g>
      ))}
      <text x="120" y="252" textAnchor="middle" className="fill-ink-3 font-mono text-[11px]">FIRST COME</text>
      <text x="440" y="252" textAnchor="middle" className="fill-ink-3 font-mono text-[11px]">SMART</text>
      {shifts.map((s, i) => {
        const a = s.firstCome.urgentWait.avg;
        const b = s.smart.urgentWait.avg;
        const strong = i === shifts.length - 1;
        return (
          <g key={s.name} className={strong ? "text-ink" : i === 1 ? "text-ink-2" : "text-ink-3"}>
            <line x1="120" x2="440" y1={y(a)} y2={y(b)} stroke="currentColor" strokeWidth={strong ? 3 : 1.5} />
            <circle cx="120" cy={y(a)} r={strong ? 5 : 3.5} fill="currentColor" />
            <circle cx="440" cy={y(b)} r={strong ? 5 : 3.5} fill="currentColor" />
            <text x="112" y={y(a) + 4} textAnchor="end" className="fill-current font-mono text-[12px] font-bold">
              {a}m
            </text>
            <text x="452" y={y(b) + 4 + i * 13 - 13} className="fill-current font-mono text-[12px] font-bold">
              {b}m · {s.name} {s.perHour}/h
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function EvidenceView() {
  const t = evidence.triage;
  const c = evidence.care;
  const peak = evidence.shifts[evidence.shifts.length - 1];

  return (
    <article className="mx-auto max-w-[1180px] px-5 pb-24 sm:px-8">
      <header className="grid gap-6 py-14 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-end">
        <div>
          <Micro>Evidence · {evidence.visits} real emergency visits · 14 synthetic charts</Micro>
          <h1 className="mt-3 text-[44px] leading-[1.02] font-bold tracking-[-0.02em] sm:text-[64px]">Does anything get missed?</h1>
        </div>
        <p className="text-[16px] leading-relaxed text-ink-2">
          We tested the same pipeline the app runs: the AI reads the nurse&apos;s note, code sets the level. The judges were three triage experts, the
          nurses who triaged the same patients, and what really happened to each patient.
        </p>
      </header>

      <Chapter
        n="01 · At the door"
        title="We missed 2 urgent patients. The triage nurses missed 8."
        lead={`Out of ${t.ours.urgentTotal} patients the experts rated level 1 or 2, how many were sent to the back of the queue (level 3 or lower)? Without the AI reading the notes, code alone would miss ${t.codeOnly.urgentMissed}.`}
      >
        <div className="grid gap-10 sm:grid-cols-2">
          <Dots total={t.nurse.urgentTotal} marked={t.nurse.urgentMissed} tone="alert" label="Triage nurses" value={`${t.nurse.urgentMissed} missed`} caption={`Under-triage ${t.nurse.under}% of all visits.`} />
          <Dots total={t.ours.urgentTotal} marked={t.ours.urgentMissed} tone="alert" label="ER Command" value={`${t.ours.urgentMissed} missed`} caption={`Under-triage ${t.ours.under}% of all visits.`} />
        </div>
      </Chapter>

      <Chapter
        n="02 · The sickest"
        title={`${evidence.level1.ours} of ${evidence.level1.total} resuscitation cases put straight to the front.`}
        lead={`Patients the experts said needed resuscitation now. The nurses put ${evidence.level1.nurse} of them at level 1.`}
      >
        <div className="grid gap-10 sm:grid-cols-2">
          <Dots total={evidence.level1.total} marked={evidence.level1.nurse} tone="l1" label="Triage nurses" value={`${evidence.level1.nurse} / ${evidence.level1.total}`} caption="Put at level 1." />
          <Dots total={evidence.level1.total} marked={evidence.level1.ours} tone="l1" label="ER Command" value={`${evidence.level1.ours} / ${evidence.level1.total}`} caption="Put at level 1." />
        </div>
      </Chapter>

      <Chapter
        n="03 · The trade-off"
        title={`We over-triage ${Math.round(t.ours.over)}% of patients. On purpose, and it shows.`}
        lead={`Our rules follow ESI, which treats a possible heart attack, stroke or GI bleed as level 2; the Korean experts often chose level 3 (nurses over-triaged ${t.nurse.over}%). The patients we raised really were sicker: they were admitted far more often. Every raised level shows its reason, and the nurse can lower it.`}
      >
        <div className="grid gap-10 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <figure>
            <Micro>Admitted to hospital, by our level</Micro>
            <div className="mt-4 flex h-44 items-end gap-3" role="img" aria-label="Admission rate by our triage level">
              {LEVELS.map((l) => {
                const v = evidence.admitted.byOurLevel[l] ?? 0;
                return (
                  <div key={l} className="flex flex-1 flex-col items-center gap-2">
                    <span className="font-mono text-[13px] font-bold tnum">{v}%</span>
                    <span className={`w-full lvl-${l}`} style={{ height: `${Math.max(v, 2) * 1.3}px`, background: "var(--lvl)" }} />
                    <LevelTile level={l} size="sm" />
                  </div>
                );
              })}
            </div>
          </figure>
          <figure>
            <Micro>Same expert level: raised by us vs not</Micro>
            <ul className="mt-4 space-y-5">
              {evidence.admitted.raised.map((r) => (
                <li key={r.expertLevel}>
                  <div className="text-[13px] text-ink-2">Experts said level {r.expertLevel}</div>
                  <div className="mt-2 grid grid-cols-[64px_1fr_44px] items-center gap-2 font-mono text-[12px]">
                    <span className="text-ink">raised</span>
                    <span className="h-2.5 bg-ink" style={{ width: `${r.raised}%` }} />
                    <span className="font-bold tnum">{r.raised}%</span>
                    <span className="text-ink-3">not</span>
                    <span className="h-2.5 bg-line-strong" style={{ width: `${r.kept}%` }} />
                    <span className="text-ink-3 tnum">{r.kept}%</span>
                  </div>
                </li>
              ))}
            </ul>
          </figure>
        </div>
      </Chapter>

      <Chapter
        n="04 · Allocation"
        title={`At peak, urgent patients wait ${peak.smart.urgentWait.avg} minutes instead of ${peak.firstCome.urgentWait.avg}.`}
        lead={`Real visits replayed at the dataset's own arrival rates, ${peak.runs} simulated 4-hour shifts each. Smart allocation also sees ${Math.round(peak.smart.seen)} patients instead of ${Math.round(peak.firstCome.seen)} — the cost is about ${Math.round(peak.smart.corridor)} patients treated on corridor trolleys at the end of a peak shift.`}
      >
        <Slope />
      </Chapter>

      <Chapter
        n="05 · On the ward"
        title={`${c.ordersExpected} of ${c.ordersExpected} orders read from notes and handwritten charts. None invented.`}
        lead={`${c.cases} synthetic notes and chart photos we wrote, with traps: a missing frequency, stopped drugs, a dose already given. The AI scheduled ${c.stoppedOrdersScheduled} of ${c.stoppedOrdersTotal} stopped drugs and told the nurse why it left them out. Real handwriting will be harder, so every task shows the words it came from and a doctor confirms the plan.`}
      >
        <div className="flex flex-wrap gap-[3px]" role="img" aria-label={`${c.ordersExpected} orders read correctly`}>
          {Array.from({ length: c.ordersExpected }, (_, i) => (
            <span key={i} className="h-7 w-[7px] bg-ok" />
          ))}
        </div>
        <dl className="mt-8 grid grid-cols-2 gap-6 sm:grid-cols-4">
          {[
            ["Orders found", `${c.ordersFound}%`],
            ["Right frequency", `${c.frequencyRight}%`],
            ["Invented", String(c.extraOrders)],
            ["Stopped drugs scheduled", `${c.stoppedOrdersScheduled} / ${c.stoppedOrdersTotal}`],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="micro">{k}</dt>
              <dd className="mt-1 font-mono text-[30px] font-bold tnum">{v}</dd>
            </div>
          ))}
        </dl>
      </Chapter>

      <footer className="border-t border-line pt-8 text-[13px] leading-relaxed text-ink-3">
        <p>
          Sources: {evidence.source}. Triage levels follow the Emergency Severity Index (ESI); the dataset uses the Korean Triage and Acuity Scale, so
          some disagreement is a difference between scales. Missed-dose background: Keers et al. 2020 (PLOS ONE), 14.6% of scheduled doses omitted. The
          care-order test set is synthetic and was written by the team; see data/care in the repository.
        </p>
      </footer>
    </article>
  );
}
