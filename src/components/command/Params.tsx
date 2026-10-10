import { TARGET_MINUTES, ZONES } from "@/er/engine";
import type { Department, Kpis } from "@/er/types";
import { dur } from "./format";
import { Icon, type IconName } from "./ui";

export type ParamKey = "urgent" | "waiting" | "overdue" | "ontime" | "beds" | "doctors";

type Param = { key: ParamKey; label: string; value: string; unit?: string; sub: string; state: "ok" | "warn" | "alarm" };

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
      key: "urgent",
      label: "Urgent patients waiting",
      value: String(k.criticalWaiting),
      sub: urgent.length ? `Longest wait ${dur(longestUrgent)} · L1–2` : "No L1–2 patients waiting",
      state: lateUrgent.length ? "alarm" : urgent.length ? "warn" : "ok",
    },
    { key: "waiting", label: "Waiting", value: String(k.waiting), sub: k.waiting ? `average ${dur(k.avgWait)}` : "no queue", state: k.waiting >= 8 ? "warn" : "ok" },
    { key: "overdue", label: "Care tasks overdue", value: String(k.tasksOverdue), sub: `${careOverdue} care tasks · ${lateFirst} first assessments`, state: k.tasksOverdue ? "alarm" : "ok" },
    {
      key: "ontime",
      label: "On time",
      value: k.tasksOnTime === null ? "—" : String(k.tasksOnTime),
      unit: k.tasksOnTime === null ? undefined : "%",
      sub: k.tasksDue ? `${k.tasksDue} due now` : "nothing due now",
      state: k.tasksOnTime !== null && k.tasksOnTime < 90 ? "warn" : "ok",
    },
    { key: "beds", label: "Beds available", value: String(free), unit: `/${total}`, sub: k.corridor ? `${k.corridor} patients without a bed` : "Ready across all care zones", state: k.corridor ? "warn" : free === 0 ? "alarm" : "ok" },
    {
      key: "doctors",
      label: "Doctors busy",
      value: String(k.doctorsBusy),
      unit: `/${k.doctorsOnShift}`,
      sub: `${k.doctorsOnShift - k.doctorsBusy} available on shift`,
      state: k.doctorsBusy === k.doctorsOnShift && k.waiting > 0 ? "warn" : "ok",
    },
  ];
}

export function Params({ dept, kpis, active, onSelect }: { dept: Department; kpis: Kpis; active: ParamKey | null; onSelect: (key: ParamKey) => void }) {
  return (
    <><section aria-label="Live numbers. Select one for details" className="metrics-grid">
      {build(dept, kpis).filter((p) => !["waiting", "ontime"].includes(p.key)).map((p) => {
        const open = active === p.key;
        const icons: Record<string, IconName> = { urgent: "people", overdue: "clock", beds: "bed", doctors: "people" };
        return (
          <button
            key={p.key}
            type="button"
            onClick={() => onSelect(p.key)}
            aria-expanded={open}
            aria-controls="param-detail"
            className={`metric-card ${p.state !== "ok" ? "metric-" + p.state : ""} ${open ? "metric-selected" : ""}`}
          >
            <span className="metric-label">{p.label}<Icon name={icons[p.key]} size={19} /></span>
            <span className="mt-1 flex items-end justify-between gap-2">
              <span className={`font-mono text-[34px] leading-none font-bold tracking-tight tnum sm:text-[44px] ${p.state === "alarm" ? "text-alert" : p.state === "warn" ? "text-warn" : "text-ink"}`}>
                {p.value}
                {p.unit && <span className="ml-0.5 text-[16px] font-semibold text-ink-3 sm:text-[20px]">{p.unit}</span>}
              </span>
              {p.state === "alarm" ? (
                <span className="alarm-blink mb-1 flex flex-none items-center gap-1.5" role="img" aria-label="Alarm">
                  <span className="size-2 rounded-full bg-alert" />
                  <span className="micro hidden text-alert! xl:inline">Alarm</span>
                </span>
              ) : (
                <span className={`micro mb-1 hidden transition-opacity sm:inline ${open ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`} aria-hidden>
                  {open ? "Close ×" : "Detail ↓"}
                </span>
              )}
            </span>
            <span className="mt-2 block text-[13px] text-ink-3">{p.sub}</span>
            {open && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-ink" aria-hidden />}
          </button>
        );
      })}
    </section><details className="secondary-metrics"><summary>More shift statistics</summary><div>{build(dept, kpis).filter((p) => ["waiting", "ontime"].includes(p.key)).map((p) => <button key={p.key} type="button" onClick={() => onSelect(p.key)} aria-controls="param-detail" aria-expanded={active === p.key}><span>{p.key === "waiting" ? "Waiting to be seen" : "Care completed on time"}</span><strong className="tnum">{p.value}{p.unit}</strong><small>{p.sub}</small></button>)}</div></details></>
  );
}
