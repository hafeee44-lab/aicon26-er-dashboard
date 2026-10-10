"use client";

import { useEffect, useState } from "react";
import { Alarms } from "@/components/command/Alarms";
import { DoorBoard } from "@/components/command/DoorBoard";
import { EvidenceView } from "@/components/command/EvidenceView";
import { FloorPlan } from "@/components/command/FloorPlan";
import { IntakeConsole } from "@/components/command/IntakeConsole";
import { Params } from "@/components/command/Params";
import { PatientSheet } from "@/components/command/PatientSheet";
import { Rounds } from "@/components/command/Rounds";
import { ShiftLog, TaskRow } from "@/components/command/Tasks";
import { Nav, TopBar, VIEWS, type View } from "@/components/command/TopBar";
import { Button, SectionHead } from "@/components/command/ui";
import { useCommand } from "@/components/command/useCommand";
import type { TaskView } from "@/er/types";

const TYPING = new Set(["INPUT", "TEXTAREA", "SELECT"]);

export default function Home() {
  const cmd = useCommand();
  const [view, setView] = useState<View>("command");
  const [openId, setOpenId] = useState<string | null>(null);
  const [intakeOpen, setIntakeOpen] = useState(false);
  const { togglePlaying } = cmd;
  const overlay = intakeOpen || openId !== null;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIntakeOpen(false);
        setOpenId(null);
        return;
      }
      if (overlay || e.metaKey || e.ctrlKey || e.altKey || TYPING.has((e.target as HTMLElement).tagName)) return;
      const v = VIEWS.find((x) => x.key === e.key);
      if (v) setView(v.id);
      if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        setIntakeOpen(true);
      }
      if (e.key === " " && (e.target as HTMLElement).tagName !== "BUTTON") {
        e.preventDefault();
        togglePlaying();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [overlay, togglePlaying]);

  const patient = cmd.dept.patients.find((p) => p.id === openId);
  const done = (t: TaskView) => cmd.complete(t.id, `${t.title} for ${t.patientName}`);
  const ward = cmd.tasks.filter((t) => t.kind !== "see_doctor" && (t.status === "overdue" || t.status === "due" || (t.status === "upcoming" && t.dueAt - cmd.dept.now <= 120)));
  const wardLate = ward.filter((t) => t.status === "overdue").length;

  return (
    <div className="min-h-screen pb-16 lg:pb-0">
      <TopBar cmd={cmd} view={view} onView={setView} onNew={() => setIntakeOpen(true)} />

      {view === "command" && (
        <main>
          <Params dept={cmd.dept} kpis={cmd.kpis} />
          <div className="grid xl:grid-cols-[minmax(0,1fr)_420px]">
            <div className="min-w-0 border-line xl:border-r">
              <div className="flex min-h-[300px] flex-col xl:max-h-[62vh]">
                <DoorBoard dept={cmd.dept} onOpen={setOpenId} />
              </div>
              <section aria-label="Ward tasks" className="border-t border-line">
                <SectionHead
                  index="03"
                  title="On the ward"
                  aside={
                    <>
                      <span className={`font-mono text-[11px] ${wardLate ? "text-alert" : "text-ink-3"}`}>{wardLate ? `${wardLate} late` : "on time"}</span>
                      <Button size="sm" onClick={() => setView("rounds")}>
                        Rounds
                      </Button>
                    </>
                  }
                />
                {ward.length ? (
                  <ul>
                    {ward.slice(0, 8).map((t) => (
                      <TaskRow key={t.id} t={t} now={cmd.dept.now} onDone={done} onOpen={setOpenId} />
                    ))}
                  </ul>
                ) : (
                  <p className="px-4 py-6 text-[13px] text-ink-3">No ward tasks are due in the next two hours.</p>
                )}
              </section>
            </div>
            <aside className="border-t border-line xl:border-t-0">
              <Alarms actions={cmd.actions} kpis={cmd.kpis} onApply={cmd.apply} />
              <section aria-label="Shift log" className="border-t border-line">
                <SectionHead index="04" title="Shift log" />
                <ShiftLog log={cmd.log} />
              </section>
            </aside>
          </div>
        </main>
      )}

      {view === "floor" && (
        <main>
          <FloorPlan dept={cmd.dept} tasks={cmd.tasks} onOpen={setOpenId} />
        </main>
      )}

      {view === "rounds" && (
        <main>
          <Rounds dept={cmd.dept} tasks={cmd.tasks} onDone={done} onOpen={setOpenId} />
        </main>
      )}

      {view === "evidence" && (
        <main>
          <EvidenceView />
        </main>
      )}

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg lg:hidden">
        <Nav view={view} onView={setView} className="grid h-14 grid-cols-4" />
      </div>

      {intakeOpen && (
        <IntakeConsole
          onClose={() => setIntakeOpen(false)}
          onAdmit={(intake, needs, review) => {
            cmd.admit(intake, needs, review);
            setIntakeOpen(false);
            setView("command");
          }}
        />
      )}

      {patient && (
        <PatientSheet
          dept={cmd.dept}
          patient={patient}
          tasks={cmd.tasks}
          onClose={() => setOpenId(null)}
          onPlan={(draft) => cmd.plan(patient.id, draft)}
          onConfirm={() => cmd.confirm(patient.id, patient.name)}
          onDone={done}
        />
      )}
    </div>
  );
}
