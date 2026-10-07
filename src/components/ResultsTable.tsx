"use client";

import { useState } from "react";
import type { Assessment, Domain, Field, Risk, Row, Value } from "@/domains";
import { download, toCSV } from "@/lib/csv";
import { Card, Pill, RiskBadge } from "./ui";

type Filter = Risk | "all";

const FILTERS: Filter[] = ["all", "high", "medium", "low"];

function show(field: Field, value: Value) {
  if (value === null || value === "") return null;
  const v = typeof value === "number" ? value.toLocaleString("en-US") : value;
  const unit = field.unit === "%" ? "%" : field.unit ? ` ${field.unit}` : "";
  return `${field.label}: ${v}${unit}`;
}

export function ResultsTable({ domain, rows, assessments }: { domain: Domain; rows: Row[]; assessments: Assessment[] }) {
  const [filter, setFilter] = useState<Filter>("all");

  const byId = new Map(rows.map((r) => [r.id, r]));
  const details = domain.fields.filter((f) => f.key !== domain.titleKey);
  const items = [...assessments]
    .sort((a, b) => b.score - a.score)
    .filter((a) => filter === "all" || a.risk === filter);

  function exportCSV() {
    const header = [...domain.fields.map((f) => f.label), "Risk", "Score", "Reason", "Action", domain.valueLabel, "Source"];
    const body = assessments.map((a) => {
      const row = byId.get(a.id);
      return [...domain.fields.map((f) => row?.[f.key]), a.risk, a.score, a.reason, a.action, a.value, a.source];
    });
    download(`${domain.product.toLowerCase()}-results.csv`, toCSV([header, ...body]));
  }

  return (
    <Card
      title={`${domain.entityPlural} · ${assessments.length}`}
      action={
        <div className="flex flex-wrap items-center gap-1">
          {FILTERS.map((f) => (
            <Pill key={f} active={filter === f} onClick={() => setFilter(f)}>
              <span className="capitalize">{f}</span>
            </Pill>
          ))}
          <button type="button" onClick={exportCSV} className="ml-2 text-xs font-medium text-brand hover:underline">
            Export CSV
          </button>
        </div>
      }
    >
      <ul className="divide-y divide-zinc-100">
        {items.map((a) => {
          const row = byId.get(a.id);

          return (
            <li key={a.id} className="grid gap-3 py-4 first:pt-0 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{String(row?.[domain.titleKey] ?? a.id)}</p>
                  <RiskBadge risk={a.risk} />
                  <span className="text-xs text-zinc-400 tabular-nums">{a.score}/100</span>
                  {a.source === "rules" && <span className="text-[10px] font-semibold text-zinc-400 uppercase">rules</span>}
                </div>
                <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                  {details.map((f) => show(f, row?.[f.key] ?? null)).filter(Boolean).join(" · ")}
                </p>
              </div>

              <div className="text-sm">
                <p className="text-zinc-700">{a.reason}</p>
                <p className="mt-1 font-medium text-brand">→ {a.action}</p>
                {a.value > 0 && (
                  <p className="mt-1 text-xs text-zinc-500">
                    {domain.valueLabel}: {domain.formatValue(a.value)}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
