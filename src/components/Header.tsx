"use client";

import { useEffect, useState } from "react";
import { domains, type Domain, type DomainId } from "@/domains";

type Status = { provider: string; model: string; ready: boolean };

export function Header({ domain, onDomainChange }: { domain: Domain; onDomainChange: (id: DomainId) => void }) {
  const [status, setStatus] = useState<Status | null>(null);

  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus(null));
  }, []);

  return (
    <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
        <div className="grid size-9 place-items-center rounded-xl bg-brand text-lg font-bold text-white">
          {domain.product[0]}
        </div>
        <div className="mr-auto leading-tight">
          <p className="font-semibold">{domain.product}</p>
          <p className="text-xs text-zinc-500">{domain.domainName}</p>
        </div>

        {process.env.NODE_ENV === "development" && (
          <select
            value={domain.id}
            onChange={(e) => onDomainChange(e.target.value as DomainId)}
            title="Only visible while developing"
            className="hidden rounded-lg border border-dashed border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-500 sm:block"
          >
            {Object.values(domains).map((d) => (
              <option key={d.id} value={d.id}>
                {d.domainName}
              </option>
            ))}
          </select>
        )}

        <span className="hidden rounded-full bg-brand/10 px-3 py-1 text-xs font-medium text-brand sm:inline">
          SDG {domain.sdg.number}
        </span>

        {status && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-3 py-1 text-xs whitespace-nowrap text-zinc-600">
            <span className={`size-2 rounded-full ${status.ready ? "bg-emerald-500" : "bg-amber-400"}`} />
            {status.ready ? status.model : "No AI key: rules mode"}
          </span>
        )}
      </div>
    </header>
  );
}
