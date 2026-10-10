"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
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

function helpSubscription(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("erc-help-dismissed", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("erc-help-dismissed", callback);
  };
}

function helpDismissed() {
  try { return localStorage.getItem("erc-help-dismissed") === "yes"; } catch { return false; }
}

function FirstRunHelp() {
  const dismissed = useSyncExternalStore(helpSubscription, helpDismissed, () => false);
  if (dismissed) return null;
  return <aside className="first-run-strip" aria-label="How ER Command works"><p><span><b>1</b> New arrival → AI reads the note</span><span><b>2</b> Code sets the level</span><span><b>3</b> Watch the queue and alarms</span></p><button type="button" aria-label="Dismiss getting started help" onClick={() => { try { localStorage.setItem("erc-help-dismissed", "yes"); } catch {} window.dispatchEvent(new Event("erc-help-dismissed")); }}>Got it</button></aside>;
}

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
    <div className="presentation-root min-h-screen pb-16 lg:pb-0">
      <TopBar cmd={cmd} view={view} onView={setView} onNew={() => setIntakeOpen(true)} />

      {view === "command" && (
        <main className="command-content">
          <div className="command-intro"><div><p className="micro">Your shift, in focus</p><h1>Who needs attention?</h1></div><p>Start with the queue. Act on the alarm.</p></div>
          <FirstRunHelp />
          <Params dept={cmd.dept} kpis={cmd.kpis} />
          <div className="command-primary-grid">
            <div className="min-w-0">
              <div className="flex min-h-[300px] flex-col">
                <DoorBoard dept={cmd.dept} onOpen={setOpenId} />
              </div>
            </div>
            <aside className="min-w-0">
              <Alarms actions={cmd.actions} kpis={cmd.kpis} onApply={cmd.apply} />
            </aside>
          </div>
          <div className="command-secondary-grid">
              <section aria-label="Ward tasks" className="command-card">
              <details className="ward-disclosure">
              <summary><span>On the ward</span><span>{wardLate ? `${wardLate} overdue` : "All on time"} · {ward.length} tasks <span aria-hidden>⌄</span></span></summary>
                <SectionHead
                  title="Care due in the next two hours"
                  aside={
                    <>
                      <Button size="sm" onClick={() => setView("rounds")}>
                        View rounds
                      </Button>
                    </>
                  }
                />
                {ward.length ? (
                  <ul>
                    {ward.slice(0, 3).map((t) => (
                      <TaskRow key={t.id} t={t} now={cmd.dept.now} onDone={done} onOpen={setOpenId} />
                    ))}
                  </ul>
                ) : (
                  <p className="px-4 py-6 text-[13px] text-ink-3">No ward tasks are due in the next two hours.</p>
                )}
              </details>
              </section>
              <section aria-label="Shift log" className="command-card">
                <SectionHead title="Shift log" />
                <ShiftLog log={cmd.log} />
              </section>
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
