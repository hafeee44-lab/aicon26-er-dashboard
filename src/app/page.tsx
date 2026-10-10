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
import { Button, SectionHead } from "@/components/command/ui";
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
      <div inert={overlay} className="min-h-screen pb-16 lg:pb-0">
        <TopBar cmd={cmd} view={view} onView={goto} onNew={() => setIntakeOpen(true)} />

        {view === "command" && (
          <main>
            <Params dept={dept} kpis={cmd.kpis} active={param} onSelect={(k) => setParam((p) => (p === k ? null : k))} />
            {param && (
              <ParamDetail
                kind={param}
                dept={dept}
                kpis={cmd.kpis}
                tasks={cmd.tasks}
                actions={cmd.actions}
                onOpen={setOpenId}
                onDone={done}
                onApply={cmd.apply}
                onClose={() => setParam(null)}
              />
            )}
            <div className="grid gap-px bg-line xl:grid-cols-[minmax(0,1fr)_420px]">
              <div className="bg-bg xl:col-start-2 xl:row-start-1">
                <AlarmList actions={cmd.actions} escalated={cmd.tasks.filter((t) => t.status === "overdue" && t.escalatedAt !== null).length} onApply={cmd.apply} />
              </div>
              <div className="flex min-h-[300px] flex-col bg-bg xl:col-start-1 xl:row-span-2 xl:row-start-1 xl:h-0 xl:min-h-[max(100%,560px)]">
                <DoorBoard dept={dept} onOpen={setOpenId} />
              </div>
              <section aria-label="On the ward" className="bg-bg xl:col-start-1 xl:row-start-3">
                <SectionHead
                  index="03"
                  title="On the ward"
                  aside={
                    <>
                      <span className={`font-mono text-[11px] ${wardLate ? "text-alert" : "text-ink-3"}`}>{wardLate ? `${wardLate} late` : "on time"}</span>
                      <Button size="sm" onClick={() => goto("rounds")}>
                        All rounds
                      </Button>
                    </>
                  }
                />
                {ward.length ? (
                  <ul>
                    {ward.slice(0, 8).map((t) => (
                      <TaskRow key={t.id} t={t} now={dept.now} onDone={done} onOpen={setOpenId} />
                    ))}
                  </ul>
                ) : (
                  <p className="px-4 py-6 text-[13px] text-ink-3">No ward tasks are late or due in the next two hours.</p>
                )}
                {ward.length > 8 && (
                  <button type="button" onClick={() => goto("rounds")} className="w-full px-4 py-2.5 text-left font-mono text-[12px] text-ink-2 hover:bg-raised">
                    + {ward.length - 8} more in Rounds →
                  </button>
                )}
              </section>
              <div className="bg-bg xl:col-start-2 xl:row-start-2">
                <Brief kpis={cmd.kpis} actions={cmd.actions} />
              </div>
              <section aria-label="Shift log" className="bg-bg xl:col-start-2 xl:row-start-3">
                <SectionHead index="05" title="Shift log" aside={<span className="font-mono text-[11px] text-ink-3">{cmd.log.length} events</span>} />
                <ShiftLog log={cmd.log} />
              </section>
            </div>
          </main>
        )}

        {view === "floor" && (
          <main>
            <FloorPlan dept={dept} tasks={cmd.tasks} onOpen={setOpenId} />
          </main>
        )}

        {view === "rounds" && (
          <main>
            <Rounds dept={dept} tasks={cmd.tasks} onDone={done} onOpen={setOpenId} />
          </main>
        )}

        {view === "evidence" && (
          <main>
            <EvidenceView />
          </main>
        )}

        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg lg:hidden">
          <Nav view={view} onView={goto} className="grid h-14 grid-cols-4" />
        </div>
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
