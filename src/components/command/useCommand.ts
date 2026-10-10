"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  actions as actionsOf,
  admit as admitOf,
  apply as applyOf,
  clock,
  completeTask as completeOf,
  confirmPlan as confirmOf,
  kpis as kpisOf,
  planCare as planOf,
  rounds,
  setPolicy as policyOf,
  surge as surgeOf,
  tick,
} from "@/er/engine";
import { mockDepartment, surgeCases } from "@/er/mock";
import { replayCases } from "@/er/replay";
import type { ActionKind, CarePlan, Department, Intake, Needs, Policy } from "@/er/types";

export type Speed = 1 | 5 | 15;
export type LogTone = "normal" | "alert" | "ok";
export type LogEntry = { id: number; at: number; text: string; tone: LogTone };

type State = { dept: Department; log: LogEntry[]; replayAt: number; seq: number };

const ACTION_LOG: Record<ActionKind, string> = {
  call_doctor: "Backup doctor called in",
  open_overflow: "Overflow area opened: 4 acute trolleys",
  free_beds: "Bed manager asked for ward discharges",
  redirect_minor: "Minor cases sent to the outpatient clinic",
  transfer: "Transfers started to nearby hospitals",
  escalate_tasks: "Overdue care escalated to the doctor and charge nurse",
};

function initial(): State {
  return {
    dept: mockDepartment(),
    log: [{ id: 0, at: 45, text: "Handover received: 8 patients in the ER, 3 on the ward", tone: "normal" }],
    replayAt: 0,
    seq: 1,
  };
}

function withLog(s: State, dept: Department, text: string, tone: LogTone = "normal"): State {
  return { ...s, dept, seq: s.seq + 1, log: [{ id: s.seq, at: dept.now, text, tone }, ...s.log].slice(0, 30) };
}

export function useCommand() {
  const [state, setState] = useState<State>(initial);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<Speed>(5);

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => setState((s) => ({ ...s, dept: tick(s.dept, speed) })), 1000);
    return () => window.clearInterval(id);
  }, [playing, speed]);

  const dept = state.dept;
  const derived = useMemo(() => ({ kpis: kpisOf(dept), actions: actionsOf(dept), tasks: rounds(dept) }), [dept]);

  const surge = useCallback((source: "demo" | "real") => {
    setState((s) => {
      const cases = source === "demo" ? surgeCases : Array.from({ length: 15 }, (_, i) => replayCases[(s.replayAt + i) % replayCases.length]);
      const next = withLog(s, surgeOf(s.dept, cases), `Surge: ${cases.length} ${source === "real" ? "real anonymised visits" : "demo patients"} arrived at once`, "alert");
      return { ...next, replayAt: source === "real" ? s.replayAt + 15 : s.replayAt };
    });
  }, []);

  const admit = useCallback((intake: Intake, needs: Needs, review: string[]) => {
    setState((s) => {
      const name = intake.name.trim() && !/^unknown$/i.test(intake.name.trim()) ? intake.name.trim() : `Arrival ${clock(s.dept.now)}`;
      return withLog(s, admitOf(s.dept, { ...intake, name }, needs, review), `Admitted ${name} from the nurse's note`);
    });
  }, []);

  const apply = useCallback((kind: ActionKind) => {
    setState((s) => withLog(s, applyOf(s.dept, kind), ACTION_LOG[kind], kind === "escalate_tasks" ? "alert" : "ok"));
  }, []);

  const changePolicy = useCallback((policy: Policy) => {
    setState((s) =>
      withLog(
        s,
        policyOf(s.dept, policy),
        policy === "smart" ? "Smart allocation on: urgent patients first. Run the clock to compare" : "First come, first served: arrival order. Run the clock to compare",
      ),
    );
  }, []);

  const plan = useCallback((patientId: string, draft: Omit<CarePlan, "confirmedAt">) => {
    setState((s) => ({ ...s, dept: planOf(s.dept, patientId, draft) }));
  }, []);

  const confirm = useCallback((patientId: string, name: string) => {
    setState((s) => withLog(s, confirmOf(s.dept, patientId), `Care plan confirmed for ${name}: reminders are live`, "ok"));
  }, []);

  const complete = useCallback((taskId: string, label: string) => {
    setState((s) => withLog(s, completeOf(s.dept, taskId), `Done: ${label}`, "ok"));
  }, []);

  const togglePlaying = useCallback(() => setPlaying((p) => !p), []);

  const reset = useCallback(() => {
    setPlaying(false);
    setState((s) => {
      const fresh = initial();
      return { ...fresh, seq: s.seq + 1, log: [{ ...fresh.log[0], id: s.seq, text: "Shift reset. Handover: 8 patients in the ER, 3 on the ward" }] };
    });
  }, []);

  return {
    dept,
    ...derived,
    log: state.log,
    playing,
    togglePlaying,
    speed,
    setSpeed,
    surge,
    admit,
    apply,
    changePolicy,
    plan,
    confirm,
    complete,
    reset,
  };
}

export type Command = ReturnType<typeof useCommand>;
