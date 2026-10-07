import { clamp, count, daysFromNow, daysUntil, flagged, minutes, num, plural, riskFromScore, valueOf } from "./helpers";
import type { Domain, Value } from "./types";

const MINUTES_PER_TASK = 2;

export const example: Domain = {
  id: "example",
  product: "Starter demo",
  domainName: "Example domain",
  tagline: "A placeholder that shows the pipeline working. Replace it with your domain.",
  problem: "This example scores a list of tasks by how likely they are to miss their due date. It only exists to show how a domain file works.",
  sdg: { number: 9, title: "Industry, Innovation and Infrastructure" },
  accent: "#475569",
  audience: "a team lead",
  entity: "task",
  entityPlural: "tasks",
  photoHint: "Photo of a to-do list or task board",
  titleKey: "task",
  fields: [
    { key: "task", label: "Task", type: "text" },
    { key: "owner", label: "Owner", type: "text" },
    { key: "due", label: "Due", type: "date" },
    { key: "progress", label: "Progress", type: "number", unit: "%", hint: "Percent done, 0 to 100" },
    { key: "notes", label: "Notes", type: "text" },
  ],
  sample: [
    { task: "Submit quarterly report", owner: "Sara", due: daysFromNow(2), progress: 30, notes: "Data abhi tak nahi mila" },
    { task: "Fix login bug", owner: "Ahmed", due: daysFromNow(-1), progress: 70, notes: "" },
    { task: "Order office supplies", owner: "Bilal", due: daysFromNow(5), progress: 100, notes: "Done" },
    { task: "Prepare training slides", owner: "Ayesha", due: daysFromNow(4), progress: 50, notes: "" },
    { task: "Renew software licences", owner: "Usman", due: daysFromNow(1), progress: 0, notes: "Vendor call nahi utha raha" },
    { task: "Update website contact page", owner: "Hina", due: daysFromNow(10), progress: 20, notes: "" },
  ],
  analysis: `You are a project coordinator.
For each task, judge how likely it is to miss its due date, using daysLeft and progress from the calculated values and the notes (which may be in Roman Urdu).
value = hours of work likely needed this week to bring the task back on time (0 to 20).
Actions name who should do what, and by when.`,
  facts(row): Record<string, Value> {
    return { daysLeft: daysUntil(row.due), progress: num(row.progress) };
  },
  message: "Short Roman Urdu reminder to the task owner, under 160 characters. Empty string if the task is on track.",
  valueLabel: "Rescue hours",
  formatValue: (n) => plural(n, "hour"),
  rules(row) {
    const daysLeft = daysUntil(row.due);
    const progress = num(row.progress);
    const score = clamp(daysLeft < 0 ? 90 : 100 - progress - Math.max(0, daysLeft) * 10);
    const risk = riskFromScore(score);

    return {
      risk,
      score,
      value: risk === "high" ? 8 : risk === "medium" ? 3 : 0,
      reason: daysLeft < 0 ? `Overdue by ${-daysLeft} days at ${progress}% done.` : `${progress}% done with ${daysLeft} days left.`,
      action:
        risk === "high"
          ? "Agree a rescue plan with the owner today."
          : risk === "medium"
            ? "Check in with the owner tomorrow."
            : "On track. No action needed.",
    };
  },
  impact(rows, assessments) {
    return [
      { label: "Tasks at risk", value: count(flagged(assessments).length, rows.length), hint: "High or medium risk" },
      { label: "Rescue hours", value: plural(valueOf(assessments), "hour"), hint: "Work needed to bring at-risk tasks back on time" },
      { label: "Overdue now", value: count(rows.filter((r) => daysUntil(r.due) < 0).length), hint: "Past their due date" },
      { label: "Review time saved", value: minutes(rows.length * MINUTES_PER_TASK), hint: `${MINUTES_PER_TASK} min per task reviewed by hand` },
    ];
  },
};
