"use client";

import { useState } from "react";
import { TARGET_MINUTES, waitingQueue } from "@/er/engine";
import type { Department, Patient } from "@/er/types";
import { ageSex, at, bedLabel, doorStatus, onCorridor, shortStaff, staffName, TONE_TEXT } from "./format";
import { LevelTile, SectionHead, Seg } from "./ui";

type Filter = "all" | "waiting" | "treating" | "corridor" | "boarding";

const COLS = "grid-cols-[30px_minmax(0,1fr)_auto] md:grid-cols-[30px_minmax(150px,1.1fr)_minmax(0,1.6fr)_52px_60px_132px_52px_96px]";

const due = (p: Patient) => p.arrivedAt + TARGET_MINUTES[p.level];

function groups(d: Department) {
  return {
    waiting: waitingQueue(d),
    treating: d.patients.filter((p) => p.stage === "with_doctor" || p.stage === "awaiting_results").sort((a, b) => a.level - b.level || a.arrivedAt - b.arrivedAt),
    boarding: d.patients.filter((p) => p.stage === "awaiting_bed").sort((a, b) => a.arrivedAt - b.arrivedAt),
  };
}

export function patientOrder(d: Department) {
  const g = groups(d);
  return [...g.waiting, ...g.treating, ...g.boarding, ...d.patients.filter((p) => p.stage === "admitted")].map((p) => p.id);
}

function Row({ d, p, pos, onOpen }: { d: Department; p: Patient; pos?: number; onOpen: (id: string) => void }) {
  const status = doorStatus(d, p);
  const bed = bedLabel(d, p);
  const isNew = d.now - p.arrivedAt <= 0;
  const seenLate = p.seenAt !== null && p.seenAt > due(p);

  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(p.id)}
        aria-label={`${pos ? `Number ${pos} in the queue: ` : ""}${p.name || "Unnamed patient"}, level ${p.level}, ${p.complaint}, ${status.code.toLowerCase()}${bed ? `, bed ${bed}` : ""}`}
        className={`group grid w-full ${COLS} items-center gap-x-3 border-b border-line px-4 py-2.5 text-left transition-colors hover:bg-raised ${isNew ? "arrive" : ""}`}
      >
        <LevelTile level={p.level} />
        <span className="min-w-0">
          <span className="flex items-center gap-2">
            {pos !== undefined && (
              <span className={`flex-none font-mono text-[11px] font-bold tnum ${pos === 1 ? "bg-ink px-1 text-inverse" : "text-ink-3"}`}>{pos === 1 ? "NEXT" : String(pos).padStart(2, "0")}</span>
            )}
            <span className="truncate font-bold group-hover:underline group-hover:decoration-line-strong group-hover:underline-offset-4">{p.name || "Unnamed patient"}</span>
            {p.source && <span className="micro flex-none border border-line px-1 text-[9px]!">Real</span>}
          </span>
          <span className="block truncate text-[12px] text-ink-3 md:hidden">{p.complaint}</span>
          <span className="block font-mono text-[11px] text-ink-3">{ageSex(p)}</span>
        </span>
        <span className="hidden min-w-0 md:block">
          <span className="block truncate text-[14px] text-ink-2">{p.complaint}</span>
          {p.flags[0] && <span className="block truncate text-[12px] text-ink-3">{p.flags[0]}</span>}
        </span>
        <span className="hidden font-mono text-[13px] text-ink-2 tnum md:block">{at(p.arrivedAt)}</span>
        {p.seenAt === null ? (
          <span className="hidden font-mono text-[13px] text-ink-2 tnum md:block">{at(due(p))}</span>
        ) : (
          <span className={`hidden font-mono text-[13px] tnum md:block ${seenLate ? "text-alert" : "text-ink-3"}`} title={`Seen at ${at(p.seenAt)}${seenLate ? ", after the target" : ""}`}>
            ✓{at(p.seenAt)}
          </span>
        )}
        <span className={`text-right font-mono text-[12px] font-bold tracking-[0.04em] md:text-left ${TONE_TEXT[status.tone]}`}>
          {status.code}
          {onCorridor(p) && <span className="block text-[10px] text-warn">CORRIDOR</span>}
        </span>
        <span className="hidden font-mono text-[13px] md:block">{bed ?? <span className="text-ink-3">—</span>}</span>
        <span className="hidden truncate text-[13px] text-ink-2 md:block">{shortStaff(staffName(d, p.doctorId))}</span>
      </button>
    </li>
  );
}

function Group({ title, patients, d, numbered = false, onOpen }: { title: string; patients: Patient[]; d: Department; numbered?: boolean; onOpen: (id: string) => void }) {
  if (!patients.length) return null;
  return (
    <>
      <li className="z-10 flex h-8 items-center justify-between border-b border-line bg-panel px-4 xl:sticky xl:top-0">
        <span className="micro">{title}</span>
        <span className="font-mono text-[11px] text-ink-3">{patients.length}</span>
      </li>
      {patients.map((p, i) => (
        <Row key={p.id} d={d} p={p} pos={numbered ? i + 1 : undefined} onOpen={onOpen} />
      ))}
    </>
  );
}

export function DoorBoard({ dept, onOpen }: { dept: Department; onOpen: (id: string) => void }) {
  const [filter, setFilter] = useState<Filter>("all");
  const g = groups(dept);
  const corridor = dept.patients.filter(onCorridor);
  const total = g.waiting.length + g.treating.length + g.boarding.length;
  const show = (f: Filter) => filter === "all" || filter === f;
  const shown = filter === "all" ? total : filter === "corridor" ? corridor.length : g[filter].length;

  return (
    <section aria-label="At the door: patients in the emergency department" className="flex min-h-0 flex-1 flex-col">
      <SectionHead
        index="01"
        title="At the door"
        aside={
          <span className="scroll-x max-w-[62vw] sm:max-w-none">
            <Seg<Filter>
              label="Show patients"
              value={filter}
              onChange={setFilter}
              options={[
                { value: "all", label: `All ${total}` },
                { value: "waiting", label: `Waiting ${g.waiting.length}` },
                { value: "treating", label: `Treating ${g.treating.length}` },
                { value: "corridor", label: `Corridor ${corridor.length}` },
                { value: "boarding", label: `Boarding ${g.boarding.length}` },
              ]}
            />
          </span>
        }
      />
      <div className={`hidden ${COLS} gap-x-3 border-b border-line px-4 py-2 md:grid`}>
        {["Lvl", "Patient", "Complaint", "In", "Due/✓", "Status", "Bed", "Doctor"].map((h) => (
          <span key={h} className="micro truncate" title={h === "Due/✓" ? "Due = arrival + target for the level. ✓ = when the first doctor saw the patient" : undefined}>
            {h}
          </span>
        ))}
      </div>
      {total === 0 ? (
        <p className="px-4 py-10 text-center text-ink-3">Nobody is in the department. Inject a surge or add a new arrival.</p>
      ) : (
        <ul className="thin-scroll relative min-h-0 flex-1 overflow-y-auto">
          {filter === "corridor" ? (
            <Group title="Treated on a corridor trolley" patients={corridor} d={dept} onOpen={onOpen} />
          ) : (
            <>
              {show("waiting") && (
                <Group
                  title={dept.policy === "smart" ? "Waiting · picked by urgency, then wait" : "Waiting · picked in arrival order"}
                  patients={g.waiting}
                  d={dept}
                  numbered
                  onOpen={onOpen}
                />
              )}
              {show("treating") && <Group title="In treatment" patients={g.treating} d={dept} onOpen={onOpen} />}
              {show("boarding") && <Group title="Admitted · waiting for a ward bed" patients={g.boarding} d={dept} onOpen={onOpen} />}
            </>
          )}
          {shown === 0 && <li className="px-4 py-8 text-center text-[13px] text-ink-3">Nobody here right now.</li>}
        </ul>
      )}
    </section>
  );
}
