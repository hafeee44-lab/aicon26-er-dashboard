"use client";

import { useMemo, useState } from "react";
import { isDone } from "@/er/engine";
import { UI_COPY } from "@/er/uiCopy";
import type { Department, Level, Patient, Stage } from "@/er/types";
import type { UiLanguage } from "@/er/uiPreferences";

type Filter = "all" | "waiting" | "with_doctor" | "awaiting_results" | "awaiting_bed";

const ACTIVE_STAGES: Stage[] = ["waiting", "with_doctor", "awaiting_results", "awaiting_bed"];
const LEVEL_STYLE: Record<Level, string> = {
  1: "bg-red-600 text-white",
  2: "bg-orange-500 text-white",
  3: "bg-yellow-400 text-slate-950",
  4: "bg-green-600 text-white",
  5: "bg-blue-600 text-white",
};

function PatientRow({ patient, department, language }: { patient: Patient; department: Department; language: UiLanguage }) {
  const copy = UI_COPY[language];
  const doctor = department.doctors.find((item) => item.id === patient.doctorId);
  const bed = department.beds.find((item) => item.id === patient.bedId);
  const wait = (patient.seenAt ?? department.now) - patient.arrivedAt;
  const corridor = !patient.bedId && patient.stage !== "waiting" && !isDone(patient);
  const status = patient.stage === "with_doctor" ? copy.withDoctor : patient.stage === "awaiting_results" ? copy.diagnostics : patient.stage === "awaiting_bed" ? copy.done : copy.waiting;

  return (
    <article className="grid gap-3 border-t border-slate-100 px-4 py-3.5 first:border-t-0 hover:bg-slate-50/80 dark:border-slate-800 dark:hover:bg-slate-800/40 md:grid-cols-[minmax(240px,1.6fr)_minmax(140px,1fr)_110px_92px] md:items-center">
      <div className="flex min-w-0 items-start gap-3">
        <span className={`grid size-9 shrink-0 place-items-center rounded-lg text-sm font-bold ${LEVEL_STYLE[patient.level]}`} aria-label={`Triage level ${patient.level}`}>L{patient.level}</span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-sm font-bold text-slate-950 dark:text-white">{patient.name}</h3>
            {patient.source ? <span className="rounded-md bg-violet-100 px-1.5 py-0.5 text-[9px] font-bold text-violet-700 dark:bg-violet-950 dark:text-violet-300">{copy.realCase}</span> : null}
            {patient.review.length ? <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">{copy.review}</span> : null}
          </div>
          <p className="mt-0.5 truncate text-xs text-slate-600 dark:text-slate-300">{patient.complaint}</p>
          <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">{patient.age ?? "—"}y · {patient.sex ?? "—"} · {patient.needs.specialty} → {patient.needs.destination}</p>
          {patient.source ? <p className="mt-1 text-[9px] font-semibold text-violet-600 dark:text-violet-400">Expert L{patient.source.expertLevel} · Nurse L{patient.source.nurseLevel} · {patient.source.outcome}</p> : null}
        </div>
      </div>

      <div className="min-w-0 md:px-2">
        {patient.flags[0] ? <p className="truncate text-[11px] font-semibold text-rose-700 dark:text-rose-400" title={patient.flags[0]}>{patient.flags[0]}</p> : <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">{patient.needs.reason}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3 text-[10px] md:block">
        <div>
          <p className="font-bold tracking-wide text-slate-400 uppercase">{copy.doctor}</p>
          <p className="mt-0.5 truncate font-semibold text-slate-700 dark:text-slate-300">{doctor?.name.replace("Dr. ", "") ?? copy.unassigned}</p>
        </div>
        <div className="md:mt-1.5">
          <p className="font-bold tracking-wide text-slate-400 uppercase">{copy.bed}</p>
          <p className={`mt-0.5 font-semibold ${corridor ? "text-rose-600 dark:text-rose-400" : "text-slate-700 dark:text-slate-300"}`}>{bed?.label ?? (corridor ? copy.corridor : "—")}</p>
        </div>
      </div>

      <div className="flex items-center justify-between md:block md:text-right">
        <span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{status}</span>
        <p className="mt-1 font-mono text-sm font-bold tabular-nums text-slate-950 dark:text-white">{wait}m</p>
      </div>
    </article>
  );
}

export function PatientBoard({ department, language }: { department: Department; language: UiLanguage }) {
  const copy = UI_COPY[language];
  const [filter, setFilter] = useState<Filter>("all");
  const filters: { id: Filter; label: string }[] = [
    { id: "all", label: copy.all },
    { id: "waiting", label: copy.waiting },
    { id: "with_doctor", label: copy.withDoctor },
    { id: "awaiting_results", label: copy.diagnostics },
    { id: "awaiting_bed", label: copy.done },
  ];

  const patients = useMemo(() => department.patients
    .filter((patient) => ACTIVE_STAGES.includes(patient.stage) && (filter === "all" || patient.stage === filter))
    .toSorted((a, b) => a.level - b.level || a.arrivedAt - b.arrivedAt), [department.patients, filter]);

  return (
    <section id="patients" className="overflow-hidden rounded-2xl border border-black/10 bg-white dark:border-white/10 dark:bg-[#171717]" aria-labelledby="patient-flow">
      <div className="border-b border-slate-100 p-4 dark:border-slate-800">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="patient-flow" className="text-base font-bold tracking-tight text-slate-950 dark:text-white">{copy.patientFlow}</h2>
            <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">{copy.patientFlowHint}</p>
          </div>
          <div className="flex max-w-full gap-1 overflow-x-auto rounded-lg bg-[#FFEFB4]/60 p-1 dark:bg-black">
            {filters.map((item) => {
              const count = department.patients.filter((patient) => ACTIVE_STAGES.includes(patient.stage) && (item.id === "all" || patient.stage === item.id)).length;
              return (
                <button key={item.id} type="button" onClick={() => setFilter(item.id)} aria-pressed={filter === item.id} className={`shrink-0 rounded-md px-2.5 py-1.5 text-[10px] font-semibold ${filter === item.id ? "bg-[#353A96] text-white" : "text-black/50 dark:text-white/50"}`}>
                  {item.label} <span className="ml-1 opacity-60">{count}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-h-[650px] overflow-y-auto">
        {patients.length ? patients.map((patient) => <PatientRow key={patient.id} patient={patient} department={department} language={language} />) : (
          <div className="grid min-h-40 place-items-center px-5 text-center text-xs font-medium text-slate-400">{copy.noPatients}</div>
        )}
      </div>
    </section>
  );
}
