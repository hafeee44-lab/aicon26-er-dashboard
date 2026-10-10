"use client";

import { useEffect, useMemo, useState } from "react";
import { AlarmList, Brief } from "@/components/command/Alarms";
import { DoorBoard, patientOrder } from "@/components/command/DoorBoard";
import { EvidenceView } from "@/components/command/EvidenceView";
import { FloorPlan } from "@/components/command/FloorPlan";
import { IntakeConsole } from "@/components/command/IntakeConsole";
import { ParamDetail } from "@/components/command/ParamDetail";
import { Params, type ParamKey } from "@/components/command/Params";
import { PatientSheet } from "@/components/command/PatientSheet";
import { Rounds } from "@/components/command/Rounds";
import { ShiftLog, TaskRow } from "@/components/command/Tasks";
import { Toast } from "@/components/command/Toast";
import { Nav, TopBar, VIEWS, type View } from "@/components/command/TopBar";
import { Button, Icon, SectionHead } from "@/components/command/ui";
import { useCommand } from "@/components/command/useCommand";
import type { TaskView } from "@/er/types";

const TYPING = new Set(["INPUT", "TEXTAREA", "SELECT"]);

export default function Home() {
  const cmd = useCommand();
  const [view, setView] = useState<View>("command");
  const [openId, setOpenId] = useState<string | null>(null);
  const [intakeOpen, setIntakeOpen] = useState(false);
  const [param, setParam] = useState<ParamKey | null>(null);
  const [toastSeen, setToastSeen] = useState(0);
  const [helpHidden, setHelpHidden] = useState(true);
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try { setHelpHidden(localStorage.getItem("erc-guide-v2") === "dismissed"); } catch { setHelpHidden(false); }
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);
  const { togglePlaying, dept } = cmd;
  const patient = dept.patients.find((p) => p.id === openId);
  const overlay = intakeOpen || patient !== undefined;
  const order = useMemo(() => patientOrder(dept), [dept]);
  const index = openId ? order.indexOf(openId) : -1;
  const latest = cmd.log[0];
  const toast = latest && latest.id > toastSeen ? latest : null;

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToastSeen(toast.id), 4200);
    return () => window.clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    document.documentElement.style.overflow = overlay ? "hidden" : "";
    return () => { document.documentElement.style.overflow = ""; };
  }, [overlay]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const typing = TYPING.has((e.target as HTMLElement).tagName);
      if (e.key === "Escape") {
        if (overlay) {
          setIntakeOpen(false);
          setOpenId(null);
        } else setParam(null);
        return;
      }
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      if (patient && !intakeOpen && (e.key === "ArrowLeft" || e.key === "ArrowRight") && index !== -1) {
        const next = order[index + (e.key === "ArrowRight" ? 1 : -1)];
        if (next) setOpenId(next);
        return;
      }
      if (overlay) return;
      if (e.key === "/") { e.preventDefault(); setView("command"); requestAnimationFrame(() => document.getElementById("patient-search")?.focus()); }
      const v = VIEWS.find((x) => x.key === e.key);
      if (v) {
        setView(v.id);
        setParam(null);
      }
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
  }, [overlay, patient, intakeOpen, index, order, togglePlaying]);

  const done = (t: TaskView) => cmd.complete(t.id, `${t.title} for ${t.patientName}`);
  const ward = cmd.tasks.filter((t) => t.kind !== "see_doctor" && (t.status === "overdue" || t.status === "due" || (t.status === "upcoming" && t.dueAt - dept.now <= 120)));
  const wardLate = ward.filter((t) => t.status === "overdue").length;
  const goto = (v: View) => {
    setView(v);
    setParam(null);
  };

  return (
    <>
      <div inert={overlay} className="app-shell">
        <TopBar cmd={cmd} view={view} onView={goto} onNew={() => setIntakeOpen(true)} />
        <main className="workspace">
          <div className="page-heading">
            <div><p className="eyebrow">Emergency care workspace</p><h1>{view === "command" ? "A clear view. Better care." : view === "floor" ? "A place for every patient." : view === "rounds" ? "The next step in their care." : "The difference, measured."}</h1><p>{view === "command" ? "Know who needs you. Keep every next step in sight." : view === "floor" ? "Beds, teams and patients. One connected department." : view === "rounds" ? "Every task has a time, an owner and a source." : "Real visits. Transparent methods. Honest limitations."}</p></div>
            <span className={`floor-status ${cmd.kpis.criticalWaiting || cmd.kpis.tasksOverdue ? "status-attention" : ""}`}><span />{cmd.kpis.criticalWaiting ? "Urgent patients waiting" : cmd.kpis.tasksOverdue ? "Care needs attention" : "Care is on track"}</span>
          </div>
          {view === "command" && <>
            {!helpHidden && <div className="first-guide"><span><b>01</b> Add a nurse’s note</span><Icon name="arrow" size={16} /><span><b>02</b> Review the priority</span><Icon name="arrow" size={16} /><span><b>03</b> Follow care and alarms</span><button type="button" aria-label="Dismiss getting started guide" onClick={() => { setHelpHidden(true); try { localStorage.setItem("erc-guide-v2", "dismissed"); } catch {} }}><Icon name="close" size={16} /></button></div>}
            <Params dept={dept} kpis={cmd.kpis} active={param} onSelect={(k) => setParam((p) => p === k ? null : k)} />
            {param && <div className="surface parameter-panel"><ParamDetail kind={param} dept={dept} kpis={cmd.kpis} tasks={cmd.tasks} actions={cmd.actions} onOpen={setOpenId} onDone={done} onApply={cmd.apply} onClose={() => setParam(null)} /></div>}
            <div className="overview-grid">
              <div className="patient-workspace"><DoorBoard dept={dept} onOpen={setOpenId} onNew={() => setIntakeOpen(true)} /></div>
              <aside className="attention-column">
                <AlarmList actions={cmd.actions} escalated={cmd.tasks.filter((t) => t.status === "overdue" && t.escalatedAt !== null).length} onApply={cmd.apply} />
                <section className="surface upcoming-care" aria-label="Care coming up">
                  <SectionHead title="Next care steps" aside={<span className={wardLate ? "text-alert" : "text-ink-3"}>{wardLate ? `${wardLate} overdue` : "On schedule"}</span>} />
                  {ward.length ? <ul>{ward.slice(0, 3).map((t) => <TaskRow key={t.id} t={t} now={dept.now} onDone={done} onOpen={setOpenId} />)}</ul> : <p className="empty-state">No ward care is due soon. Upcoming tasks appear here.</p>}
                  <button type="button" className="panel-link" onClick={() => goto("rounds")}>Open care rounds <Icon name="arrow" size={17} /></button>
                </section>
                <Brief kpis={cmd.kpis} actions={cmd.actions} />
              </aside>
            </div>
            <section className="surface activity-panel" aria-label="Shift activity"><SectionHead title="Shift activity" aside={<span className="muted">A record of what changed</span>} /><ShiftLog log={cmd.log} /></section>
          </>}
          {view === "floor" && <FloorPlan dept={dept} tasks={cmd.tasks} onOpen={setOpenId} />}
          {view === "rounds" && <Rounds dept={dept} tasks={cmd.tasks} onDone={done} onOpen={setOpenId} />}
          {view === "evidence" && <EvidenceView />}
          <footer className="workspace-footer"><span>ER Command · Nothing gets missed.</span><span>Decision support only. A clinician makes the final decision.</span><Button size="sm" onClick={() => { setHelpHidden(false); goto("command"); }}>Quick guide</Button></footer>
        </main>
        <div className="mobile-navigation"><Nav view={view} onView={goto} /></div>
      </div>

      {toast && !overlay && <Toast entry={toast} onClose={() => setToastSeen(toast.id)} />}

      {intakeOpen && (
        <IntakeConsole
          onClose={() => setIntakeOpen(false)}
          onAdmit={(intake, needs, review) => {
            cmd.admit(intake, needs, review);
            setIntakeOpen(false);
            goto("command");
          }}
        />
      )}

      {patient && (
        <PatientSheet
          key={patient.id}
          dept={dept}
          patient={patient}
          tasks={cmd.tasks}
          position={index !== -1 ? `${index + 1}/${order.length}` : undefined}
          onPrev={index > 0 ? () => setOpenId(order[index - 1]) : undefined}
          onNext={index !== -1 && index < order.length - 1 ? () => setOpenId(order[index + 1]) : undefined}
          onClose={() => setOpenId(null)}
          onPlan={(draft) => cmd.plan(patient.id, draft)}
          onConfirm={() => cmd.confirm(patient.id, patient.name)}
          onDone={done}
        />
      )}
    </>
  );
}
