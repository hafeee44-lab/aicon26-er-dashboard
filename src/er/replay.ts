import pool from "./replay.json";
import type { Arrival, SurgeCase } from "./types";

export const replayCases = pool as SurgeCase[];

export const ARRIVALS_PER_HOUR = { typical: 7, busy: 12, peak: 17 };

export function replayArrivals(perHour: number, minutes: number, seed = 1): Arrival[] {
  let s = seed;
  const gap = () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return (-Math.log(1 - s / 4294967296) * 60) / perHour;
  };
  const arrivals: Arrival[] = [];

  for (let at = gap(); at < minutes; at += gap()) {
    arrivals.push({ ...replayCases[arrivals.length % replayCases.length], at: Math.floor(at) });
  }

  return arrivals;
}
