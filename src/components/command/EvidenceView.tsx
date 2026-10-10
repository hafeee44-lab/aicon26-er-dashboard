import { LEVELS } from "@/er/engine";
import { evidence } from "@/er/evidence";
import type { ReactNode } from "react";

function Comparison({ rows, max, unit = "", problem = false }: { rows: { label: string; value: number; suffix?: string }[]; max: number; unit?: string; problem?: boolean }) {
  return <div className="evidence-comparison" role="img" aria-label={rows.map((row) => `${row.label}: ${row.value}${row.suffix ?? unit}`).join("; ")}>{rows.map((row, i) => <div key={row.label}><span>{row.label}</span><div className="comparison-track"><i style={{ width: `${Math.max(2, row.value / Math.max(max, 1) * 100)}%` }} className={problem ? "problem-bar" : i === 1 ? "strong-bar" : ""} /></div><b className="font-mono tnum">{row.value}{row.suffix ?? unit}</b></div>)}</div>;
}

function Section({ index, headline, value, unit, caption, children }: { index: string; headline: string; value: string | number; unit?: string; caption: string; children: ReactNode }) {
  return <section className="evidence-section"><div><p className="micro">{index}</p><h2>{headline}</h2><p>{caption}</p></div><div className="evidence-result"><strong className="font-mono tnum">{value}<small>{unit}</small></strong>{children}</div></section>;
}

export function EvidenceView() {
  const t = evidence.triage;
  const c = evidence.care;
  const peak = evidence.shifts[evidence.shifts.length - 1];
  return <article className="calm-evidence"><header><p className="micro">Evidence from {evidence.visits} anonymised visits</p><h1>See what changes when care follows urgency.</h1><p>The same patients, compared against expert triage and arrival order.</p></header>
    <Section index="01 · Urgent patients" headline={`ER Command missed ${t.ours.urgentMissed} urgent patients; triage nurses missed ${t.nurse.urgentMissed}.`} value={t.ours.urgentMissed} unit={`/ ${t.ours.urgentTotal} missed`} caption={`Experts rated these ${t.ours.urgentTotal} patients level 1 or 2.`}>
      <Comparison max={t.ours.urgentTotal} problem rows={[{ label: "Triage nurses", value: t.nurse.urgentMissed, suffix: ` / ${t.nurse.urgentTotal}` }, { label: "ER Command", value: t.ours.urgentMissed, suffix: ` / ${t.ours.urgentTotal}` }]} />
      <details className="calm-details"><summary>More about missed cases</summary><p>Under-triage across all visits: nurses {t.nurse.under}%, ER Command {t.ours.under}%. Code without AI note reading missed {t.codeOnly.urgentMissed} urgent patients.</p></details>
    </Section>
    <Section index="02 · Immediate care" headline={`ER Command put ${evidence.level1.ours} resuscitation cases at the front.`} value={evidence.level1.ours} unit={`/ ${evidence.level1.total} caught`} caption={`Experts identified ${evidence.level1.total} cases needing immediate resuscitation.`}>
      <Comparison max={evidence.level1.total} rows={[{ label: "Triage nurses", value: evidence.level1.nurse, suffix: ` / ${evidence.level1.total}` }, { label: "ER Command", value: evidence.level1.ours, suffix: ` / ${evidence.level1.total}` }]} />
    </Section>
    <Section index="03 · The trade-off" headline="More patients receive higher priority, so the reasons matter." value={Math.round(t.ours.over)} unit="% over-triaged" caption="Our rules rate possible heart attack, stroke and bleeding conservatively.">
      <Comparison max={100} unit="%" rows={[{ label: "Triage nurses", value: t.nurse.over }, { label: "ER Command", value: t.ours.over }]} />
      <details className="calm-details"><summary>More about raised priority</summary><p>ESI often rates these cases level 2; the Korean experts often chose level 3. Raised patients were admitted more often. Every priority shows its reason.</p><div className="admission-rows">{LEVELS.map((level) => <div key={level}><span>Level {level} · admitted</span><b className="font-mono tnum">{evidence.admitted.byOurLevel[level] ?? 0}%</b></div>)}{evidence.admitted.raised.map((row) => <div key={row.expertLevel}><span>Expert level {row.expertLevel} · raised / kept</span><b className="font-mono tnum">{row.raised}% / {row.kept}%</b></div>)}</div></details>
    </Section>
    <Section index="04 · Waiting" headline={`At peak, urgent wait fell from ${peak.firstCome.urgentWait.avg} to ${peak.smart.urgentWait.avg} minutes.`} value={peak.smart.urgentWait.avg} unit="minutes" caption={`Same real arrivals, averaged over ${peak.runs} simulated four-hour shifts.`}>
      <Comparison max={peak.firstCome.urgentWait.avg} unit="m" rows={[{ label: "Arrival order", value: peak.firstCome.urgentWait.avg }, { label: "Smart order", value: peak.smart.urgentWait.avg }]} />
      <details className="calm-details"><summary>More about the shift replay</summary><div className="admission-rows">{evidence.shifts.map((shift) => <div key={shift.name}><span>{shift.name} · arrival / smart wait</span><b className="font-mono tnum">{shift.firstCome.urgentWait.avg}m / {shift.smart.urgentWait.avg}m</b></div>)}</div><p>At peak, Smart sees {Math.round(peak.smart.seen)} patients versus {Math.round(peak.firstCome.seen)}. About {Math.round(peak.smart.corridor)} patients finish the shift on corridor trolleys.</p></details>
    </Section>
    <Section index="05 · Note reading" headline="The reader preserves recorded fields without inventing values." value={evidence.reading.correct} unit="% correct" caption={`${evidence.reading.fieldsChecked.toLocaleString()} fields checked; ${evidence.reading.invented} invented values.`}>
      <p>Missing and uncertain fields still need a clinician’s review.</p>
    </Section>
    <Section index="06 · Ward care" headline="Orders in the synthetic chart set were read without inventions." value={c.ordersFound} unit="% found" caption={`${c.ordersExpected} expected orders across ${c.cases} synthetic notes and charts.`}>
      <details className="calm-details"><summary>More about the care-order test</summary><div className="admission-rows">{[["Right frequency", `${c.frequencyRight}%`], ["Invented orders", String(c.extraOrders)], ["Stopped drugs scheduled", `${c.stoppedOrdersScheduled} / ${c.stoppedOrdersTotal}`]].map(([label, value]) => <div key={label}><span>{label}</span><b className="font-mono tnum">{value}</b></div>)}</div><p>The set includes missing frequencies, stopped drugs and doses already given. Real handwriting will be harder; a clinician confirms every care plan.</p></details>
    </Section>
    <p className="evidence-takeaway">Put urgent care first, explain each decision, and follow every task.</p>
    <footer><p>Sources: {evidence.source}. ESI and the Korean Triage and Acuity Scale differ. Missed-dose background: Keers et al. 2020 (PLOS ONE). Care-order charts are synthetic and written by the team.</p><p>Decision support only; not clinically validated. A clinician makes every final decision.</p></footer>
  </article>;
}
