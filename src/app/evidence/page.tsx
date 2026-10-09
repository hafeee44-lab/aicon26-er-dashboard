import Link from "next/link";
import { EvidenceView } from "@/components/command/EvidenceView";
import { Brand } from "@/components/command/TopBar";

export const metadata = { title: "Evidence · ER Command" };

export default function EvidencePage() {
  return (
    <div className="min-h-screen">
      <header className="flex h-14 items-center justify-between border-b border-line px-4 lg:px-6">
        <Brand />
        <Link href="/" className="btn btn-sm">
          Open the live board
        </Link>
      </header>
      <EvidenceView />
    </div>
  );
}
