"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Alarms, Brief } from "@/components/command/Alarms";
import { DoorBoard } from "@/components/command/DoorBoard";
import { EvidenceView } from "@/components/command/EvidenceView";
import { FloorPlan } from "@/components/command/FloorPlan";
import { IntakeConsole } from "@/components/command/IntakeConsole";
import { Params } from "@/components/command/Params";
import { PatientSheet } from "@/components/command/PatientSheet";
import { Rounds } from "@/components/command/Rounds";
import { ShiftLog, TaskRow } from "@/components/command/Tasks";
import { Nav, TopBar, VIEWS, type View } from "@/components/command/TopBar";
import { Button, Icon, SectionHead } from "@/components/command/ui";
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
      if (e.key === "/") {
        e.preventDefault();
        setView("command");
        requestAnimationFrame(() => document.getElementById("patient-search")?.focus());
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
    <div className="presentation-root">
      <a className="skip-link" href="#workspace">Skip to workspace</a>
      <TopBar cmd={cmd} view={view} onView={setView} onNew={() => setIntakeOpen(true)} />

      {view === "command" && (
        <main id="workspace" className="command-content">
          <div className="command-intro"><div><p className="eyebrow">Emergency department / Overview</p><h1>Nothing gets missed<span>.</span></h1><p>The right care. The right person. Right on time.</p></div><div className="shift-state"><span className={cmd.actions.length ? "status-dot attention" : "status-dot"} /><span>{cmd.actions.length ? "Your team needs you" : "Your shift is on track"}<small>{cmd.kpis.waiting} waiting · {cmd.kpis.doctorsOnShift} doctors on shift</small></span></div></div>
          <Params dept={cmd.dept} kpis={cmd.kpis} />
          <Alarms actions={cmd.actions} kpis={cmd.kpis} onApply={cmd.apply} />
          <div className="command-primary-grid">
            <DoorBoard dept={cmd.dept} onOpen={setOpenId} />
            <aside className="overview-side">
              <section aria-label="Ward tasks" className="command-card ward-card">
                <div className="ward-heading"><div><p className="eyebrow">Beyond the waiting room</p><h2>Care to follow up</h2></div><span className={`count-chip ${wardLate ? "text-alert" : ""}`}>{wardLate ? `${wardLate} late` : "On time"}</span></div>
                {ward.length ? (
                  <ul>
                    {ward.slice(0, 3).map((t) => (
                      <TaskRow key={t.id} t={t} now={cmd.dept.now} onDone={done} onOpen={setOpenId} />
                    ))}
                  </ul>
                ) : (
                  <div className="friendly-empty"><Icon name="check" /><strong>Care is on schedule</strong><p>No ward tasks due in the next two hours.</p></div>
                )}
                <button className="ward-footer" type="button" onClick={() => setView("rounds")}>See all rounds<Icon name="arrow" size={18} /></button>
              </section>
              <Brief actions={cmd.actions} kpis={cmd.kpis} />
            </aside>
          </div>
          <div className="command-secondary-grid">
              <section aria-label="Shift log" className="command-card">
                <SectionHead title="Shift activity" aside={<Icon name="clock" size={18} />} />
                <ShiftLog log={cmd.log} />
              </section>
              <div className="overview-guide"><Icon name="pulse" size={28} /><h2>From a note to the next step.</h2><p>AI reads the nurse’s note. Clinical rules set priority. Your team makes the decision.</p><Button onClick={() => setIntakeOpen(true)}>Add a new arrival<Icon name="arrow" size={18} /></Button><FirstRunHelp /></div>
          </div>
          <footer className="workspace-footer"><span>ER Command · Every patient accounted for.</span><span>Decision support. Clinicians make every final decision.</span></footer>
        </main>
      )}

      {view === "floor" && (
        <main id="workspace" className="mode-content">
          <div className="mode-intro"><p className="eyebrow">Space & people</p><h1>The whole floor. In view.</h1><p>Find a bed, see who’s caring, and follow the next task.</p></div>
          <FloorPlan dept={cmd.dept} tasks={cmd.tasks} onOpen={setOpenId} />
        </main>
      )}

      {view === "rounds" && (
        <main id="workspace" className="mode-content">
          <div className="mode-intro"><p className="eyebrow">Care coordination</p><h1>Every task has its time.</h1><p>Start with overdue care. Know who’s responsible.</p></div>
          <Rounds dept={cmd.dept} tasks={cmd.tasks} onDone={done} onOpen={setOpenId} />
        </main>
      )}

      {view === "evidence" && (
        <main id="workspace">
          <EvidenceView />
        </main>
      )}

      <div className="mobile-navigation">
        <Nav view={view} onView={setView} />
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
