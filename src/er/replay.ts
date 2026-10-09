import { arrivalsFrom } from "./engine";
import pool from "./replay.json";
import type { SurgeCase } from "./types";

export const replayCases = pool as SurgeCase[];

export const ARRIVALS_PER_HOUR = { typical: 7, busy: 12, peak: 17 };

export function replayArrivals(perHour: number, minutes: number, seed = 1) {
  return arrivalsFrom(replayCases, perHour, minutes, seed);
}
