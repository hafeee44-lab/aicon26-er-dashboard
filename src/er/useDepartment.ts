"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { actions, admit, apply, kpis, setPolicy, surge, tick } from "./engine";
import { mockDepartment, surgeCases } from "./mock";
import { replayCases } from "./replay";
import type { ActionKind, Intake, Needs, Policy } from "./types";

export type SimulationSpeed = 1 | 5 | 15;

export function useDepartment() {
  const [department, setDepartment] = useState(mockDepartment);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<SimulationSpeed>(1);
  const replayIndex = useRef(0);

  useEffect(() => {
    if (!playing) return;

    const timer = window.setInterval(() => {
      setDepartment((current) => tick(current, speed));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [playing, speed]);

  const reset = useCallback(() => {
    setPlaying(false);
    replayIndex.current = 0;
    setDepartment(mockDepartment());
  }, []);

  const triggerSurge = useCallback((source: "demo" | "real") => {
    const cases = source === "demo"
      ? surgeCases
      : Array.from({ length: 15 }, (_, index) => replayCases[(replayIndex.current + index) % replayCases.length]);
    if (source === "real") replayIndex.current = (replayIndex.current + 15) % replayCases.length;
    setDepartment((current) => surge(current, cases));
  }, []);

  const admitPatient = useCallback((intake: Intake, needs: Needs, review: string[]) => {
    setDepartment((current) => admit(current, intake, needs, review));
  }, []);

  const applyAction = useCallback((kind: ActionKind) => {
    setDepartment((current) => apply(current, kind));
  }, []);

  const changePolicy = useCallback((policy: Policy) => {
    setDepartment((current) => setPolicy(current, policy));
  }, []);

  return {
    department,
    kpis: useMemo(() => kpis(department), [department]),
    actions: useMemo(() => actions(department), [department]),
    playing,
    speed,
    setPlaying,
    setSpeed,
    reset,
    triggerSurge,
    admitPatient,
    applyAction,
    changePolicy,
  };
}
