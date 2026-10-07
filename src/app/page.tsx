"use client";

import { useState, type CSSProperties } from "react";
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { Workspace } from "@/components/Workspace";
import { defaultDomainId, domains, type DomainId } from "@/domains";

export default function Home() {
  const [domainId, setDomainId] = useState<DomainId>(defaultDomainId);
  const domain = domains[domainId];

  return (
    <div style={{ "--brand": domain.accent } as CSSProperties} className="min-h-full">
      <Header domain={domain} onDomainChange={setDomainId} />
      <Hero domain={domain} />
      <Workspace key={domain.id} domain={domain} />
      <footer className="border-t border-zinc-200 py-6 text-center text-xs text-zinc-400">
        {domain.product} · Built at AICON&apos;26 · SDG {domain.sdg.number}: {domain.sdg.title}
      </footer>
    </div>
  );
}
