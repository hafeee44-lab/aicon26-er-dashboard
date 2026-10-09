import { isBusy } from "@/er/engine";
import { UI_COPY } from "@/er/uiCopy";
import type { Department, Zone } from "@/er/types";
import type { UiLanguage } from "@/er/uiPreferences";

const ZONE_LABEL: Record<Zone, string> = { resus: "Resus", acute: "Acute", fasttrack: "Fast track" };

export function CapacityPanel({ department, language }: { department: Department; language: UiLanguage }) {
  const copy = UI_COPY[language];
  const onShift = department.doctors.filter((doctor) => doctor.onShift);

  return (
    <section id="resources" className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-[#171717]" aria-labelledby="capacity-title">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 id="capacity-title" className="text-base font-bold text-slate-950 dark:text-white">{copy.capacity}</h2>
          <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">{copy.capacityHint}</p>
        </div>
        <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">{onShift.length} {copy.onShift}</p>
      </div>

      <div className="mt-4 space-y-3">
        {(["resus", "acute", "fasttrack"] as Zone[]).map((zone) => {
          const beds = department.beds.filter((bed) => bed.zone === zone);
          const free = beds.filter((bed) => !bed.patientId).length;
          return (
            <div key={zone}>
              <div className="flex items-center justify-between text-[10px]">
                <span className="font-bold text-slate-700 dark:text-slate-300">{ZONE_LABEL[zone]}</span>
                <span className="font-semibold text-slate-400">{free}/{beds.length}</span>
              </div>
              <div className="mt-1.5 flex gap-1">
                {beds.map((bed) => (
                  <span key={bed.id} title={`${bed.label}: ${bed.patientId ? "occupied" : "free"}`} className={`h-2 flex-1 rounded-full ${bed.patientId ? "bg-black/15 dark:bg-white/15" : "bg-[#353A96]"}`} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
        {department.doctors.map((doctor) => {
          const busy = isBusy(department, doctor);
          return (
            <div key={doctor.id} className="flex min-w-0 items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-2 dark:bg-slate-950">
              <span className={`size-2 shrink-0 rounded-full ${!doctor.onShift ? "bg-black/15 dark:bg-white/15" : busy ? "bg-[#FFEFB4] ring-1 ring-black/20" : "bg-[#353A96]"}`} />
              <div className="min-w-0">
                <p className="truncate text-[10px] font-bold text-slate-800 dark:text-slate-200">{doctor.name.replace("Dr. ", "")}</p>
                <p className="truncate text-[9px] text-slate-400">{!doctor.onShift ? `${copy.backup} · ${copy.offShift}` : busy ? copy.withDoctor : copy.available}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
