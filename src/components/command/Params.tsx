import { ZONES } from "@/er/engine";
import type { Department, Kpis } from "@/er/types";
import { dur } from "./format";
import { Icon } from "./ui";

export function Params({ dept, kpis }: { dept: Department; kpis: Kpis }) {
  const urgent = dept.patients.filter((p) => p.stage === "waiting" && p.level <= 2);
  const longest = urgent.length ? Math.max(...urgent.map((p) => dept.now - p.arrivedAt)) : 0;
  const free = ZONES.reduce((n, zone) => n + kpis.bedsFree[zone], 0);
  const total = ZONES.reduce((n, zone) => n + kpis.bedsTotal[zone], 0);
  const params = [
    { label: "Urgent patients waiting", value: urgent.length, sub: urgent.length ? `Longest wait ${dur(longest)} · levels 1–2` : "All urgent patients are receiving care", problem: urgent.length > 0, icon: "people" as const, tag: urgent.length ? "Needs attention" : "On track" },
    { label: "Overdue care tasks", value: kpis.tasksOverdue, sub: "Assessments and care past their due time", problem: kpis.tasksOverdue > 0, icon: "clock" as const, tag: kpis.tasksOverdue ? "Action required" : "On time" },
    { label: "Treatment beds free", value: free, total, sub: kpis.corridor ? `${kpis.corridor} patients on corridor trolleys` : "Ready for the next patient", problem: free === 0, icon: "floor" as const, tag: free === 0 ? "At capacity" : "Available" },
    { label: "Doctors with patients", value: kpis.doctorsBusy, total: kpis.doctorsOnShift, sub: "On-shift doctors · backups excluded", problem: false, icon: "pulse" as const, tag: `${Math.max(0, kpis.doctorsOnShift - kpis.doctorsBusy)} available` },
  ];
  return <section aria-label="Shift at a glance" className="command-kpis">{params.map((p) => <article key={p.label} className={`kpi-tile ${p.problem ? "has-problem" : ""}`}><div className="kpi-title"><h2>{p.label}</h2><Icon name={p.icon} /></div><div className="kpi-number-row"><div className="kpi-value tnum">{p.value}{p.total !== undefined && <span>/ {p.total}</span>}</div><span className="kpi-tag">{p.tag}</span></div><p>{p.sub}</p></article>)}</section>;
}
