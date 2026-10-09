import { isBusy, LEVELS, ZONES } from "@/er/engine";
import type { Bed, Department, Patient, TaskView, Zone } from "@/er/types";
import { ageSex, doorStatus, onCorridor, shortStaff, TONE_TEXT } from "./format";
import { LevelTile, Micro, SectionHead } from "./ui";
import { taskCode } from "./Tasks";

const ZONE_NAME: Record<Zone, string> = { resus: "Resus", acute: "Acute", fasttrack: "Fast track" };
const ZONE_COLS: Record<Zone, string> = { resus: "grid-cols-1 sm:grid-cols-2", acute: "grid-cols-2 sm:grid-cols-4", fasttrack: "grid-cols-2 sm:grid-cols-3" };

function BedTile({ d, bed, onOpen }: { d: Department; bed: Bed; onOpen: (id: string) => void }) {
  const p = d.patients.find((x) => x.id === bed.patientId);
  if (!p) {
    return (
      <div className="flex min-h-[86px] flex-col justify-between border border-dashed border-line-strong p-2.5">
        <span className="font-mono text-[12px] font-bold text-ink-3">{bed.label}</span>
        <span className="micro">Free</span>
      </div>
    );
  }
  const status = doorStatus(d, p);
  return (
    <button type="button" onClick={() => onOpen(p.id)} aria-label={`Bed ${bed.label}: ${p.name}, level ${p.level}, ${status.code.toLowerCase()}`} className={`lvl-${p.level} lvl-edge flex min-h-[86px] flex-col justify-between border border-line-strong bg-raised p-2.5 pl-3.5 text-left hover:border-ink-3`}>
      <span className="flex items-center justify-between">
        <span className="font-mono text-[12px] font-bold">{bed.label}</span>
        <LevelTile level={p.level} size="sm" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[13px] font-bold">{p.name}</span>
        <span className={`block truncate font-mono text-[10px] font-bold ${TONE_TEXT[status.tone]}`}>{status.code}</span>
      </span>
    </button>
  );
}

function Trolley({ d, p, onOpen }: { d: Department; p: Patient; onOpen: (id: string) => void }) {
  return (
    <button type="button" onClick={() => onOpen(p.id)} aria-label={`On a corridor trolley: ${p.name}, level ${p.level}`} className="flex min-w-[180px] items-center gap-2.5 border border-warn/60 bg-raised px-3 py-2 text-left hover:border-warn">
      <LevelTile level={p.level} size="sm" />
      <span className="min-w-0">
        <span className="block truncate text-[13px] font-bold">{p.name}</span>
        <span className="block truncate font-mono text-[10px] text-warn">{doorStatus(d, p).code}</span>
      </span>
    </button>
  );
}

export function FloorPlan({ dept, tasks, onOpen }: { dept: Department; tasks: TaskView[]; onOpen: (id: string) => void }) {
  const corridor = dept.patients.filter(onCorridor);
  const waiting = dept.patients.filter((p) => p.stage === "waiting");
  const ward = dept.patients.filter((p) => p.stage === "admitted" || p.stage === "awaiting_bed");
  const open = (patientId: string) => tasks.filter((t) => t.patientId === patientId && t.status !== "done" && t.kind !== "see_doctor");

  return (
    <div className="grid gap-px bg-line">
      <section aria-label="Emergency department beds" className="bg-bg">
        <SectionHead index="01" title="Emergency department · floor plan" aside={<span className="font-mono text-[11px] text-ink-3">select a bed to open the patient</span>} />
        <div className="grid gap-4 p-4 lg:grid-cols-[1fr_2fr_1.5fr]">
          {ZONES.map((zone) => {
            const beds = dept.beds.filter((b) => b.zone === zone);
            const free = beds.filter((b) => !b.patientId).length;
            return (
              <div key={zone} className="border-2 border-line-strong">
                <div className="flex items-center justify-between border-b border-line-strong px-3 py-2">
                  <span className="text-[13px] font-bold tracking-[0.04em] uppercase">{ZONE_NAME[zone]}</span>
                  <span className={`font-mono text-[11px] ${free ? "text-ink-3" : "text-alert"}`}>
                    {free}/{beds.length} free
                  </span>
                </div>
                <div className={`grid gap-2 p-2 ${ZONE_COLS[zone]}`}>
                  {beds.map((b) => (
                    <BedTile key={b.id} d={dept} bed={b} onOpen={onOpen} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid gap-4 px-4 pb-4 lg:grid-cols-[2fr_1fr]">
          <div className={`border-2 ${corridor.length ? "border-warn/70" : "border-line"}`}>
            <div className="flex items-center justify-between border-b border-line px-3 py-2">
              <span className="text-[13px] font-bold tracking-[0.04em] uppercase">Corridor</span>
              <span className={`font-mono text-[11px] ${corridor.length ? "text-warn" : "text-ink-3"}`}>{corridor.length} on trolleys</span>
            </div>
            <div className="scroll-x flex gap-2 p-2">
              {corridor.length ? corridor.map((p) => <Trolley key={p.id} d={dept} p={p} onOpen={onOpen} />) : <span className="p-2 text-[13px] text-ink-3">Nobody is being treated on the corridor.</span>}
            </div>
          </div>
          <div className="border-2 border-line">
            <div className="flex items-center justify-between border-b border-line px-3 py-2">
              <span className="text-[13px] font-bold tracking-[0.04em] uppercase">Waiting room</span>
              <span className="font-mono text-[11px] text-ink-3">{waiting.length} waiting</span>
            </div>
            <div className="flex items-end gap-3 p-3">
              {LEVELS.map((l) => (
                <div key={l} className="flex flex-col items-center gap-1.5">
                  <span className="font-mono text-[20px] font-bold tnum">{waiting.filter((p) => p.level === l).length}</span>
                  <LevelTile level={l} size="sm" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section aria-label="Ward" className="bg-bg">
        <SectionHead index="02" title="Ward · admitted patients and their next task" />
        <ul className="grid gap-px bg-line sm:grid-cols-2 xl:grid-cols-3">
          {ward.map((p) => {
            const next = open(p.id);
            const late = next.filter((t) => t.status === "overdue").length;
            return (
              <li key={p.id} className="bg-bg">
                <button type="button" onClick={() => onOpen(p.id)} aria-label={`${p.name}, level ${p.level}${late ? `, ${late} tasks late` : ""}`} className="block w-full p-4 text-left hover:bg-raised">
                  <span className="flex items-center gap-2.5">
                    <LevelTile level={p.level} size="sm" />
                    <span className="truncate font-bold">{p.name}</span>
                    <span className="font-mono text-[11px] text-ink-3">{ageSex(p)}</span>
                    {late > 0 && <span className="ml-auto font-mono text-[11px] font-bold text-alert">{late} LATE</span>}
                  </span>
                  <span className="mt-1.5 block truncate text-[13px] text-ink-2">{p.plan?.problems[0] ?? p.complaint}</span>
                  <span className="mt-2 block font-mono text-[12px]">
                    {next[0] ? (
                      <>
                        <span className={next[0].status === "overdue" ? "text-alert" : next[0].status === "due" ? "text-warn" : "text-ink-2"}>{taskCode(next[0], dept.now)}</span>
                        <span className="text-ink-3"> · {next[0].title}</span>
                      </>
                    ) : (
                      <span className="text-warn">{p.plan ? "No open tasks" : "No care plan yet: add the chart"}</span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-label="Staff" className="bg-bg">
        <SectionHead index="03" title="Staff on shift" />
        <div className="grid gap-px bg-line md:grid-cols-2">
          <ul className="bg-bg">
            {dept.doctors.map((doc) => {
              const p = dept.patients.find((x) => x.doctorId === doc.id && x.stage === "with_doctor");
              return (
                <li key={doc.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-line px-4 py-2">
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-bold">{doc.name}</span>
                    <span className="text-[11px] text-ink-3 capitalize">{doc.specialty}</span>
                  </span>
                  <span className={`font-mono text-[11px] font-bold ${!doc.onShift ? "text-ink-3" : isBusy(dept, doc) ? "text-warn" : "text-ok"}`}>
                    {!doc.onShift ? "BACKUP · OFF" : p ? `WITH ${p.name.split(" ")[0].toUpperCase()}` : "FREE"}
                  </span>
                </li>
              );
            })}
          </ul>
          <ul className="bg-bg">
            {dept.nurses.map((n) => {
              const mine = tasks.filter((t) => t.ownerId === n.id && t.status !== "done");
              const late = mine.filter((t) => t.status === "overdue").length;
              const patients = dept.patients.filter((p) => p.nurseId === n.id && (p.stage === "admitted" || !["discharged", "left", "redirected", "transferred"].includes(p.stage))).length;
              return (
                <li key={n.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-line px-4 py-2">
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-bold">{n.name}</span>
                    <span className="text-[11px] text-ink-3">{patients} patients · {mine.length} open tasks</span>
                  </span>
                  <span className={`font-mono text-[11px] font-bold ${late ? "text-alert" : "text-ink-3"}`}>{late ? `${late} LATE` : shortStaff(n.name)}</span>
                </li>
              );
            })}
            <li className="px-4 py-3">
              <Micro>Nurse tasks: medicines, drips, dressings, observations, tests · Doctor tasks: reviews</Micro>
            </li>
          </ul>
        </div>
      </section>
    </div>
  );
}
