import Link from "next/link";
import { EvidenceView } from "@/components/command/EvidenceView";
import { Brand } from "@/components/command/TopBar";

export const metadata = { title: "Evidence · ER Command" };

export default function EvidencePage() {
  return (
    <div className="min-h-screen">
      <header className="app-header"><div className="header-inner justify-between">
        <Brand />
        <Link href="/" className="btn btn-sm">
          Back to dashboard
        </Link>
      </div></header>
      <main className="workspace"><div className="page-heading"><div><p className="eyebrow">Behind the decisions</p><h1>The difference, measured.</h1><p>Real visits. Transparent methods. Honest limitations.</p></div></div><EvidenceView /></main>
    </div>
  );
}
