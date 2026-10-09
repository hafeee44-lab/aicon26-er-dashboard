import { TARGET_MINUTES } from "@/er/engine";
import type { Department, Patient } from "@/er/types";
import { ageSex, at, bedLabel, doorStatus, onCorridor, shortStaff, staffName, TONE_TEXT } from "./format";
import { LevelTile, SectionHead } from "./ui";

const COLS = "grid-cols-[30px_minmax(0,1fr)_auto] md:grid-cols-[30px_minmax(150px,1.1fr)_minmax(0,1.6fr)_56px_56px_132px_52px_96px]";

function Row({ d, p, onOpen }: { d: Department; p: Patient; onOpen: (id: string) => void }) {
  const status = doorStatus(d, p);
  const bed = bedLabel(d, p);
  const isNew = d.now - p.arrivedAt <= 0;

  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(p.id)}
        aria-label={`${p.name || "Unnamed patient"}, level ${p.level}, ${p.complaint}, ${status.code.toLowerCase()}${bed ? `, bed ${bed}` : ""}`}
        className={`grid w-full ${COLS} items-center gap-x-3 border-b border-line px-4 py-2.5 text-left transition-colors hover:bg-raised ${isNew ? "arrive" : ""}`}
      >
        <LevelTile level={p.level} />
        <span className="min-w-0">
          <span className="flex items-center gap-2">
            <span className="truncate font-bold">{p.name || "Unnamed patient"}</span>
            {p.source && <span className="micro border border-line px-1 text-[9px]!">Real</span>}
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
          <span className="hidden font-mono text-[13px] text-ink-2 tnum md:block">{at(p.arrivedAt + TARGET_MINUTES[p.level])}</span>
        ) : (
          <span className={`hidden font-mono text-[11px] tnum md:block ${p.seenAt > p.arrivedAt + TARGET_MINUTES[p.level] ? "text-alert" : "text-ink-3"}`} title={`Seen at ${at(p.seenAt)}`}>
            seen
            <br />
            {at(p.seenAt)}
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

function Group({ title, patients, d, onOpen }: { title: string; patients: Patient[]; d: Department; onOpen: (id: string) => void }) {
  if (!patients.length) return null;
  return (
    <>
      <li className="sticky top-0 z-10 flex h-8 items-center justify-between border-b border-line bg-panel px-4">
        <span className="micro">{title}</span>
        <span className="font-mono text-[11px] text-ink-3">{patients.length}</span>
      </li>
      {patients.map((p) => (
        <Row key={p.id} d={d} p={p} onOpen={onOpen} />
      ))}
    </>
  );
}

export function DoorBoard({ dept, onOpen }: { dept: Department; onOpen: (id: string) => void }) {
  const due = (p: Patient) => p.arrivedAt + TARGET_MINUTES[p.level];
  const waiting = dept.patients.filter((p) => p.stage === "waiting").sort((a, b) => due(a) - due(b) || a.level - b.level);
  const treating = dept.patients.filter((p) => p.stage === "with_doctor" || p.stage === "awaiting_results").sort((a, b) => a.level - b.level || a.arrivedAt - b.arrivedAt);
  const boarding = dept.patients.filter((p) => p.stage === "awaiting_bed").sort((a, b) => a.arrivedAt - b.arrivedAt);
  const total = waiting.length + treating.length + boarding.length;

  return (
    <section aria-labelledby="door-title" className="flex min-h-0 flex-col">
      <SectionHead
        index="01"
        title="At the door"
        aside={<span className="hidden font-mono text-[11px] text-ink-3 sm:inline">due = arrival + target for the level</span>}
      />
      <span id="door-title" className="sr-only">
        Patients in the emergency department
      </span>
      <div className={`hidden ${COLS} gap-x-3 border-b border-line px-4 py-2 md:grid`}>
        {["Lvl", "Patient", "Complaint · why this level", "In", "Due", "Status", "Bed", "Doctor"].map((h) => (
          <span key={h} className="micro">
            {h}
          </span>
        ))}
      </div>
      {total === 0 ? (
        <p className="px-4 py-10 text-center text-ink-3">Nobody is waiting. Inject a surge or add a new arrival.</p>
      ) : (
        <ul className="thin-scroll relative min-h-0 flex-1 overflow-y-auto">
          <Group title="Waiting for a doctor" patients={waiting} d={dept} onOpen={onOpen} />
          <Group title="In treatment" patients={treating} d={dept} onOpen={onOpen} />
          <Group title="Admitted · waiting for a ward bed" patients={boarding} d={dept} onOpen={onOpen} />
        </ul>
      )}
    </section>
  );
}
