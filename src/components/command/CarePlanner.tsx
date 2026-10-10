"use client";

import { useState } from "react";
import { INTERVAL_MINUTES } from "@/er/engine";
import { demoCareNotes, demoCharts } from "@/er/demo-notes";
import type { CareOrder, CareResponse, Patient } from "@/er/types";
import { readUpload } from "@/lib/files";
import type { Attachment } from "@/lib/types";
import { at, FREQ_LABEL, KIND_LABEL } from "./format";
import { Badge, Button, Glyph, Icon, Micro, ModeBadge } from "./ui";

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function Rhythm({ order }: { order: CareOrder }) {
  const every = INTERVAL_MINUTES[order.frequency];
  const ticks = order.frequency === "as_needed" ? [] : every === null ? [0] : Array.from({ length: Math.floor(1439 / every) + 1 }, (_, i) => i * every);
  return (
    <div className="relative mt-2 h-3" aria-label={`${FREQ_LABEL[order.frequency]} over the next 24 hours`} role="img">
      <span className={`absolute inset-x-0 top-1.5 h-px ${order.frequency === "as_needed" ? "border-t border-dashed border-ink-3" : "bg-line-strong"}`} />
      {[0, 6, 12, 18, 24].map((h) => (
        <span key={h} className="absolute top-1 h-1 w-px bg-ink-3" style={{ left: `${(h / 24) * 100}%` }} />
      ))}
      {ticks.map((m) => (
        <span key={m} className="absolute top-0 h-3 w-1 -translate-x-1/2 bg-ink" style={{ left: `${(m / 1440) * 100}%` }} />
      ))}
    </div>
  );
}

function OrderItem({ order }: { order: CareOrder }) {
  return (
    <li className="care-order">
      <div className="flex items-start gap-2.5">
        <span className="mt-1.5">
          <Glyph kind={order.kind} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="font-bold">{order.title}</span>
            <span className="font-mono text-[11px] text-ink-3">{FREQ_LABEL[order.frequency]}</span>
            {order.suggested && <Badge tone="muted">Suggested by rules</Badge>}
          </div>
          <Rhythm order={order} />
          {order.suggested ? (
            <p className="mt-1.5 text-[12px] text-ink-3">{order.source.replace("Suggested by our rules: ", "")}</p>
          ) : (
            <p className="mt-1 text-[12px] text-ink-3">
              {KIND_LABEL[order.kind]} · from the chart: <span className="hand text-[19px] leading-none">{order.source}</span>
            </p>
          )}
        </div>
      </div>
    </li>
  );
}

export function CarePlanner({
  patient,
  now,
  onPlan,
  onConfirm,
}: {
  patient: Patient;
  now: number;
  onPlan: (draft: CareResponse["plan"]) => void;
  onConfirm: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [file, setFile] = useState<{ attachment: Attachment; label: string; preview: string | null } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [meta, setMeta] = useState<CareResponse["meta"] | null>(null);
  const plan = patient.plan;

  async function read(input: { note: string; files: Attachment[] }) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/care", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...input, patient: { age: patient.age, sex: patient.sex, complaint: patient.complaint } }),
      });
      const body = (await res.json()) as CareResponse & { error?: string };
      if (!res.ok) throw new Error(body.error || "The chart could not be read");
      setMeta(body.meta);
      onPlan(body.plan);
      setOpen(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function sample(chart: (typeof demoCharts)[number]) {
    try {
      const res = await fetch(chart.src);
      if (!res.ok) throw new Error("The sample chart could not be loaded");
      const attachment = { mimeType: chart.mimeType, data: await blobToBase64(await res.blob()) };
      setFile({ attachment, label: chart.label, preview: chart.src });
      await read({ note: "", files: [attachment] });
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function upload(f: File | undefined) {
    if (!f) return;
    setError("");
    try {
      const { attachment, preview } = await readUpload(f);
      setFile({ attachment, label: f.name, preview });
    } catch {
      setError("That file could not be opened. Use a JPG, PNG or PDF (iPhone HEIC photos: take a screenshot instead).");
    }
  }

  if (open || !plan) {
    return (
      <div className={loading ? "scanning" : ""}>
        {!open && !plan ? (
          <div className="care-plan-empty">
            <Icon name="rounds" size={30} />
            <h4>Turn written orders into a care plan.</h4>
            <p>Upload a treatment chart or paste the doctor&apos;s notes. Review the extracted orders before scheduling care.</p>
            <Button variant="solid" className="mt-3" onClick={() => setOpen(true)}>
              Add a chart or notes <Icon name="plus" size={16} />
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Micro>Sample charts · handwritten, synthetic</Micro>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {demoCharts.map((c) => (
                  <button key={c.src} type="button" disabled={loading} onClick={() => sample(c)} className="group overflow-hidden rounded-xl border border-line text-left hover:border-ink-3">
                    <img src={c.src} alt="" className="h-24 w-full object-cover object-top opacity-90 group-hover:opacity-100" />
                    <span className="block px-2 py-1.5 text-[12px] leading-tight text-ink-2">{c.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Micro>Or upload a photo or PDF</Micro>
              <label className="mt-2 flex cursor-pointer flex-wrap items-center gap-3 rounded-xl border border-dashed border-line-strong p-4 text-[13px] hover:border-ink-3">
                <span className="btn btn-sm">Choose file</span>
                <span className="truncate text-ink-2">{file?.label ?? "Treatment chart, lab report or discharge note"}</span>
                <input type="file" accept="image/*,application/pdf" className="sr-only" onChange={(e) => upload(e.target.files?.[0])} />
              </label>
            </div>
            <div>
              <label htmlFor={`care-note-${patient.id}`} className="micro">
                Or type the orders
              </label>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {demoCareNotes.map((n) => (
                  <button key={n} type="button" className="btn btn-sm" onClick={() => setNote(n)}>
                    {n.split("\n")[0].split(".")[0].slice(0, 28)}
                  </button>
                ))}
              </div>
              <textarea
                id={`care-note-${patient.id}`}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={5}
                placeholder={"Inj ceftriaxone 1g IV BD\nRL 1L 8 hourly\nDressing daily"}
                className="ruled mt-2 w-full resize-y border border-line bg-raised px-3 py-1 font-mono text-[13px] leading-[28px] outline-none focus:border-ink-3"
              />
            </div>
            {error && <p className="text-[13px] text-alert">{error}</p>}
            <div className="flex gap-2">
              <Button variant="solid" disabled={loading || (!note.trim() && !file)} onClick={() => read({ note, files: file ? [file.attachment] : [] })}>
                {loading ? "Reading the chart…" : "Extract written orders"}
              </Button>
              {plan && (
                <Button onClick={() => setOpen(false)} disabled={loading}>
                  Cancel
                </Button>
              )}
              {!plan && (
                <Button onClick={() => setOpen(false)} disabled={loading}>
                  Close
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      {plan.problems.length > 0 && (
        <ol className="mb-3 space-y-1">
          {plan.problems.map((pr, i) => (
            <li key={pr} className="flex gap-2.5 text-[14px]">
              <span className="font-mono text-[11px] text-ink-3">{String(i + 1).padStart(2, "0")}</span>
              {pr}
            </li>
          ))}
        </ol>
      )}
      {plan.review.length > 0 && (
        <div className="mb-3 border-l-2 border-warn bg-raised px-3 py-2 text-[13px]">
          <span className="micro text-warn!">Check before confirming</span>
          {plan.review.map((r) => (
            <p key={r} className="mt-1 text-ink-2">
              {r}
            </p>
          ))}
        </div>
      )}
      <ul>
        {plan.orders.map((o, i) => (
          <OrderItem key={`${o.title}-${i}`} order={o} />
        ))}
      </ul>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {plan.confirmedAt === null ? (
          <Button variant="solid" onClick={onConfirm}>
            Confirm plan & schedule care
          </Button>
        ) : (
          <Badge tone="ok">Live since {at(plan.confirmedAt)}</Badge>
        )}
        <Button size="sm" onClick={() => setOpen(true)}>
          Read a new chart
        </Button>
        {meta && <ModeBadge mode={meta.mode} cached={meta.cached} />}
        {plan.confirmedAt === null && <span className="text-[12px] text-ink-3">Nothing is scheduled until a doctor confirms. Times start at {at(now + 15)}.</span>}
      </div>
    </div>
  );
}
