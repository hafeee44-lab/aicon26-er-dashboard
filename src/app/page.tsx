"use client";

import Link from "next/link";
import { useState } from "react";
import type { ReactNode } from "react";
import { ActionsPanel } from "@/components/er/ActionsPanel";
import { CapacityPanel } from "@/components/er/CapacityPanel";
import { DashboardHeader } from "@/components/er/DashboardHeader";
import type { DashboardWindow } from "@/components/er/DashboardHeader";
import { IntakePanel } from "@/components/er/IntakePanel";
import { KpiGrid } from "@/components/er/KpiGrid";
import { PatientBoard } from "@/components/er/PatientBoard";
import { clock } from "@/er/engine";
import { evidence } from "@/er/evidence";
import { UI_COPY } from "@/er/uiCopy";
import { useDepartment } from "@/er/useDepartment";
import { useUiPreferences } from "@/er/uiPreferences";
import type { UiLanguage } from "@/er/uiPreferences";

export default function Home() {
  const simulation = useDepartment();
  const preferences = useUiPreferences();
  const [activeWindow, setActiveWindow] = useState<DashboardWindow>("overview");
  const [intakeOpen, setIntakeOpen] = useState(false);

  return (
    <div className={`${preferences.theme === "dark" ? "dark" : ""} ${preferences.language === "ur" ? "font-urdu" : "font-sans"}`} dir={preferences.language === "ur" ? "rtl" : "ltr"}>
      <div className="min-h-screen bg-[#F8F7EF] text-black transition-colors dark:bg-black dark:text-white">
        <DashboardHeader
          activeWindow={activeWindow}
          theme={preferences.theme}
          language={preferences.language}
          onWindow={setActiveWindow}
          onTheme={preferences.changeTheme}
          onLanguage={preferences.changeLanguage}
          onNewPatient={() => setIntakeOpen(true)}
        />

        <main className="mx-auto min-h-[calc(100vh-113px)] max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
          {activeWindow === "overview" ? <OverviewWindow simulation={simulation} language={preferences.language} /> : null}
          {activeWindow === "patients" ? <PatientsWindow simulation={simulation} language={preferences.language} /> : null}
          {activeWindow === "resources" ? <ResourcesWindow simulation={simulation} language={preferences.language} /> : null}
          {activeWindow === "evidence" ? <EvidenceWindow language={preferences.language} /> : null}
        </main>

        {intakeOpen ? (
          <div className="fixed inset-0 z-50 grid place-items-end bg-black/70 p-0 backdrop-blur-sm sm:place-items-center sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setIntakeOpen(false); }}>
            <IntakePanel language={preferences.language} onAdmit={simulation.admitPatient} onClose={() => setIntakeOpen(false)} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

type Simulation = ReturnType<typeof useDepartment>;

const WINDOW_COPY = {
  en: { start: "Start shift", pause: "Pause shift", smartActive: "Smart queue active", settings: "Queue settings", evidenceHint: "Four numbers judges can understand immediately.", fullEvidence: "Full evidence", missed: "Urgent cases missed", nurses: "Nurses", caught: "Critical cases caught", fields: "Fields read correctly", invented: "invented values", peak: "Peak urgent wait", firstCome: "First come" },
  ur: { start: "شفٹ شروع", pause: "شفٹ روکیں", smartActive: "سمارٹ قطار فعال", settings: "قطار کی ترتیب", evidenceHint: "چار اعداد جو جج فوراً سمجھ سکیں۔", fullEvidence: "مکمل ثبوت", missed: "چھوٹے ہوئے فوری کیس", nurses: "نرسیں", caught: "پہچانے گئے سنگین کیس", fields: "درست پڑھے گئے فیلڈز", invented: "گھڑی ہوئی ویلیوز", peak: "رش میں فوری انتظار", firstCome: "پہلے آئیں" },
  roman: { start: "Shift shuru", pause: "Shift rokein", smartActive: "Smart queue active", settings: "Queue settings", evidenceHint: "Char numbers jo judges foran samajh sakein.", fullEvidence: "Pura saboot", missed: "Urgent cases miss", nurses: "Nurses", caught: "Critical cases pakray", fields: "Fields sahi parhay", invented: "banayi hui values", peak: "Peak urgent wait", firstCome: "Pehle aaye" },
} satisfies Record<UiLanguage, Record<string, string>>;

function OverviewWindow({ simulation, language }: { simulation: Simulation; language: UiLanguage }) {
  const copy = UI_COPY[language];
  const windowCopy = WINDOW_COPY[language];
  const urgentWait = simulation.kpis.timeToDoctor[1] ?? simulation.kpis.timeToDoctor[2] ?? 0;

  return (
    <section aria-labelledby="overview-title" className="space-y-4">
      <div className="grid gap-4 md:grid-cols-[minmax(0,1.65fr)_minmax(220px,.65fr)]">
        <div className="flex min-h-64 flex-col justify-between rounded-3xl bg-[#353A96] p-5 text-white shadow-xl shadow-[#353A96]/15 sm:min-h-72 sm:p-7">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-bold tracking-[0.15em] text-[#FFEFB4] uppercase"><span className="size-2 rounded-full bg-[#FFEFB4]" />{copy.liveShift} · {clock(simulation.department.now)}</div>
            <h1 id="overview-title" className="mt-4 max-w-2xl text-2xl font-bold tracking-tight sm:text-4xl">{copy.commandTitle}</h1>
            <p className="mt-3 max-w-xl text-xs leading-relaxed text-white/65 sm:text-sm">{copy.commandBody}</p>
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => simulation.setPlaying(!simulation.playing)} className="rounded-xl bg-[#FFEFB4] px-5 py-3 text-xs font-bold text-black">{simulation.playing ? windowCopy.pause : windowCopy.start}</button>
            <span className="text-xs font-semibold text-white/60">{windowCopy.smartActive}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-1">
          <FocusMetric label="L1–2 wait" value={`${urgentWait}m`} calm={urgentWait < 15} />
          <FocusMetric label={copy.critical} value={String(simulation.kpis.criticalWaiting)} calm={simulation.kpis.criticalWaiting === 0} />
        </div>
      </div>

      <KpiGrid kpis={simulation.kpis} language={language} />

      {simulation.actions.length ? <div className="max-w-xl"><ActionsPanel actions={simulation.actions} kpis={simulation.kpis} language={language} onApply={simulation.applyAction} /></div> : null}
    </section>
  );
}

function PatientsWindow({ simulation, language }: { simulation: Simulation; language: UiLanguage }) {
  const copy = UI_COPY[language];
  return (
    <section aria-labelledby="patients-window-title">
      <WindowHeading title={copy.patientFlow} description={copy.patientFlowHint}>
        <button type="button" onClick={() => simulation.triggerSurge("real")} className="rounded-xl bg-[#353A96] px-4 py-3 text-xs font-bold text-white">+ {copy.realSurge}</button>
      </WindowHeading>
      <PatientBoard department={simulation.department} language={language} />
    </section>
  );
}

function ResourcesWindow({ simulation, language }: { simulation: Simulation; language: UiLanguage }) {
  const copy = UI_COPY[language];
  const windowCopy = WINDOW_COPY[language];
  return (
    <section aria-labelledby="resources-window-title">
      <WindowHeading title={copy.capacity} description={copy.capacityHint} />
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <CapacityPanel department={simulation.department} language={language} />
        <div className="rounded-2xl border border-black/10 bg-[#FFEFB4] p-5 text-black dark:border-white/10 dark:bg-[#171717] dark:text-white">
          <p className="text-[10px] font-bold tracking-[0.14em] text-black/45 uppercase dark:text-white/40">{windowCopy.settings}</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => simulation.changePolicy("smart")} className={`rounded-xl px-3 py-3 text-xs font-bold ${simulation.department.policy === "smart" ? "bg-[#353A96] text-white" : "border border-black/15 dark:border-white/15"}`}>{copy.smart}</button>
            <button type="button" onClick={() => simulation.changePolicy("first_come")} className={`rounded-xl px-3 py-3 text-xs font-bold ${simulation.department.policy === "first_come" ? "bg-[#353A96] text-white" : "border border-black/15 dark:border-white/15"}`}>{copy.firstCome}</button>
          </div>
          <button type="button" onClick={simulation.reset} className="mt-4 text-[10px] font-bold text-black/45 underline underline-offset-4 dark:text-white/45">{copy.reset}</button>
        </div>
      </div>
    </section>
  );
}

function EvidenceWindow({ language }: { language: UiLanguage }) {
  const copy = UI_COPY[language];
  const windowCopy = WINDOW_COPY[language];
  const cards = [
    { value: `${evidence.triage.ours.urgentMissed}/${evidence.triage.ours.urgentTotal}`, label: windowCopy.missed, detail: `${windowCopy.nurses}: ${evidence.triage.nurse.urgentMissed}/${evidence.triage.nurse.urgentTotal}` },
    { value: `${evidence.level1.ours}/${evidence.level1.total}`, label: windowCopy.caught, detail: `${windowCopy.nurses}: ${evidence.level1.nurse}/${evidence.level1.total}` },
    { value: `${evidence.reading.correct}%`, label: windowCopy.fields, detail: `${evidence.reading.invented} ${windowCopy.invented}` },
    { value: `${evidence.shifts[2].smart.urgentWait.avg}m`, label: windowCopy.peak, detail: `${windowCopy.firstCome}: ${evidence.shifts[2].firstCome.urgentWait.avg}m` },
  ];

  return (
    <section aria-labelledby="evidence-window-title">
      <WindowHeading title={copy.evidence} description={windowCopy.evidenceHint}>
        <Link href="/evidence" className="rounded-xl bg-black px-4 py-3 text-xs font-bold text-white dark:bg-[#FFEFB4] dark:text-black">{windowCopy.fullEvidence} →</Link>
      </WindowHeading>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card, index) => <article key={card.label} className={`min-h-44 rounded-3xl p-5 sm:min-h-52 sm:p-6 ${index === 0 ? "bg-[#353A96] text-white" : "border border-black/10 bg-white text-black dark:border-white/10 dark:bg-[#171717] dark:text-white"}`}><p className={`text-[9px] font-bold tracking-[0.14em] uppercase sm:text-[10px] ${index === 0 ? "text-[#FFEFB4]" : "text-black/40 dark:text-white/40"}`}>0{index + 1}</p><p className="mt-5 font-mono text-3xl font-bold tracking-tight sm:mt-7 sm:text-4xl">{card.value}</p><h2 className="mt-2 text-xs font-bold sm:mt-3 sm:text-sm">{card.label}</h2><p className={`mt-1 text-[10px] sm:text-xs ${index === 0 ? "text-white/60" : "text-black/50 dark:text-white/50"}`}>{card.detail}</p></article>)}
      </div>
      <p className="mt-5 text-[10px] text-black/45 dark:text-white/45">Source: {evidence.source}</p>
    </section>
  );
}

function WindowHeading({ title, description, children }: { title: string; description: string; children?: ReactNode }) {
  return <div className="mb-5 flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-xl font-bold tracking-tight sm:text-2xl">{title}</h1><p className="mt-1 text-[11px] text-black/50 dark:text-white/50 sm:text-xs">{description}</p></div>{children}</div>;
}

function FocusMetric({ label, value, calm }: { label: string; value: string; calm: boolean }) {
  return <article className="flex min-h-28 flex-col justify-between rounded-3xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-[#171717] sm:min-h-32 sm:p-5"><p className="text-[9px] font-bold tracking-[0.14em] text-black/40 uppercase dark:text-white/40 sm:text-[10px]">{label}</p><div className="flex items-end justify-between"><p className="font-mono text-3xl font-bold tracking-tight sm:text-4xl">{value}</p><span className={`mb-1 size-2.5 rounded-full sm:size-3 ${calm ? "bg-[#353A96]" : "bg-red-500"}`} /></div></article>;
}
