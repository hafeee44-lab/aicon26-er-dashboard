import type { Language, Summary } from "@/lib/types";
import { Card, Pill } from "./ui";

export function SummaryCard({
  summary,
  language,
  loading,
  onLanguage,
}: {
  summary: Summary | null;
  language: Language;
  loading: boolean;
  onLanguage: (lang: Language) => void;
}) {
  const urdu = language === "ur";

  return (
    <Card
      title="AI summary"
      action={
        <div className="flex gap-1">
          <Pill active={!urdu} onClick={() => onLanguage("en")}>English</Pill>
          <Pill active={urdu} onClick={() => onLanguage("ur")}>اردو</Pill>
        </div>
      }
    >
      {!summary ? (
        <div className="space-y-2">
          <div className="h-5 w-2/3 animate-pulse rounded bg-zinc-100" />
          <div className="h-4 w-full animate-pulse rounded bg-zinc-100" />
          <div className="h-4 w-5/6 animate-pulse rounded bg-zinc-100" />
        </div>
      ) : (
        <div dir={urdu ? "rtl" : "ltr"} className={`transition ${loading ? "opacity-40" : ""} ${urdu ? "font-urdu leading-[2.4]" : ""}`}>
          <p className="text-lg font-semibold">{summary.headline}</p>
          <p className="mt-2 text-zinc-600">{summary.summary}</p>
          <ol className="mt-4 space-y-2">
            {summary.actions.map((action, i) => (
              <li key={i} className="flex gap-3">
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-brand/10 text-xs font-semibold text-brand">
                  {i + 1}
                </span>
                <span>{action}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </Card>
  );
}
