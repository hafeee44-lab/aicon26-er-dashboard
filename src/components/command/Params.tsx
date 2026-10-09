import { TARGET_MINUTES, ZONES } from "@/er/engine";
import type { Department, Kpis } from "@/er/types";
import { dur, type Tone } from "./format";

type Param = { label: string; value: string; unit?: string; sub: string; state: "ok" | "warn" | "alarm" };

const STATE_TONE: Record<Param["state"], Tone> = { ok: "normal", warn: "warn", alarm: "alert" };

function build(d: Department, k: Kpis): Param[] {
  const urgent = d.patients.filter((p) => p.stage === "waiting" && p.level <= 2);
  const lateUrgent = urgent.filter((p) => d.now - p.arrivedAt > TARGET_MINUTES[p.level]);
  const longestUrgent = urgent.length ? Math.max(...urgent.map((p) => d.now - p.arrivedAt)) : 0;
  const free = ZONES.reduce((n, z) => n + k.bedsFree[z], 0);
  const total = ZONES.reduce((n, z) => n + k.bedsTotal[z], 0);
  const lateFirst = d.patients.filter((p) => p.stage === "waiting" && d.now - p.arrivedAt > TARGET_MINUTES[p.level]).length;
  const careOverdue = k.tasksOverdue - lateFirst;

  return [
    {
      label: "Urgent waiting",
      value: String(k.criticalWaiting),
      sub: urgent.length ? `longest ${dur(longestUrgent)} · L1 now, L2 15m` : "level 1–2 seen on time",
      state: lateUrgent.length ? "alarm" : urgent.length ? "warn" : "ok",
    },
    { label: "Waiting", value: String(k.waiting), sub: k.waiting ? `average ${dur(k.avgWait)}` : "no queue", state: k.waiting >= 8 ? "warn" : "ok" },
    {
      label: "Overdue",
      value: String(k.tasksOverdue),
      sub: `${careOverdue} care · ${lateFirst} first assessment`,
      state: k.tasksOverdue ? "alarm" : "ok",
    },
    {
      label: "On time",
      value: k.tasksOnTime === null ? "—" : String(k.tasksOnTime),
      unit: k.tasksOnTime === null ? undefined : "%",
      sub: `${k.tasksDue} due now`,
      state: k.tasksOnTime !== null && k.tasksOnTime < 90 ? "warn" : "ok",
    },
    { label: "Beds free", value: String(free), unit: `/${total}`, sub: k.corridor ? `${k.corridor} on corridor trolleys` : "nobody on the corridor", state: k.corridor ? "warn" : free === 0 ? "alarm" : "ok" },
    {
      label: "Doctors busy",
      value: String(k.doctorsBusy),
      unit: `/${k.doctorsOnShift}`,
      sub: k.boarding ? `${k.boarding} boarding for a bed` : "no boarders",
      state: k.doctorsBusy === k.doctorsOnShift && k.waiting > 0 ? "warn" : "ok",
    },
  ];
}

export function Params({ dept, kpis }: { dept: Department; kpis: Kpis }) {
  const params = build(dept, kpis);

  return (
    <section aria-label="Live numbers" className="scroll-x grid grid-flow-col auto-cols-[minmax(168px,1fr)] border-b border-line xl:grid-flow-row xl:grid-cols-6">
      {params.map((p) => {
        const tone = STATE_TONE[p.state];
        return (
          <div key={p.label} className="relative border-r border-line px-4 pt-3 pb-3.5 last:border-r-0">
            {p.state !== "ok" && <span className={`absolute inset-x-0 top-0 h-0.5 ${p.state === "alarm" ? "bg-alert" : "bg-warn"}`} />}
            <div className="flex items-center justify-between">
              <span className="micro">{p.label}</span>
              {p.state === "alarm" && <span className="alarm-blink micro text-alert!">Alarm</span>}
            </div>
            <div className={`mt-1 font-mono text-[44px] leading-none font-bold tracking-tight tnum ${tone === "alert" ? "text-alert" : tone === "warn" ? "text-warn" : "text-ink"}`}>
              {p.value}
              {p.unit && <span className="ml-0.5 text-[20px] font-semibold text-ink-3">{p.unit}</span>}
            </div>
            <div className="mt-1.5 truncate text-[12px] text-ink-2">{p.sub}</div>
          </div>
        );
      })}
    </section>
  );
}
