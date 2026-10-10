import { TARGET_MINUTES, ZONES } from "@/er/engine";
import type { Department, Kpis } from "@/er/types";
import { dur } from "./format";

export function Params({ dept, kpis }: { dept: Department; kpis: Kpis }) {
  const urgent = dept.patients.filter((p) => p.stage === "waiting" && p.level <= 2);
  const late = urgent.some((p) => dept.now - p.arrivedAt > TARGET_MINUTES[p.level]);
  const longest = urgent.length ? Math.max(...urgent.map((p) => dept.now - p.arrivedAt)) : 0;
  const free = ZONES.reduce((n, zone) => n + kpis.bedsFree[zone], 0);
  const total = ZONES.reduce((n, zone) => n + kpis.bedsTotal[zone], 0);
  const params = [
    { label: "Urgent waiting", value: String(urgent.length), sub: urgent.length ? `Longest wait ${dur(longest)} · levels 1–2` : "Every urgent patient has been seen", abnormal: late || urgent.length > 0 },
    { label: "Overdue", value: String(kpis.tasksOverdue), sub: "Care and first assessments past their target", abnormal: kpis.tasksOverdue > 0 },
    { label: "Beds free", value: String(free), unit: `/ ${total}`, sub: kpis.corridor ? `${kpis.corridor} patients have no treatment bed` : "Treatment beds available now", abnormal: free === 0 || kpis.corridor > 0 },
    { label: "Doctors busy", value: String(kpis.doctorsBusy), unit: `/ ${kpis.doctorsOnShift}`, sub: "Doctors currently caring for patients", abnormal: kpis.doctorsBusy === kpis.doctorsOnShift && kpis.waiting > 0 },
  ];
  return <section aria-label="Four live shift numbers" className="command-kpis">{params.map((p) => <article key={p.label} className={p.abnormal ? "kpi-tile has-problem" : "kpi-tile"}><h2>{p.label}</h2><div className="kpi-value font-mono tnum">{p.value}{p.unit && <span>{p.unit}</span>}</div><p>{p.sub}</p></article>)}</section>;
}
