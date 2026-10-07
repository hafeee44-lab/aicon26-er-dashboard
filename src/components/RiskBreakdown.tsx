import type { Assessment, Domain, Risk } from "@/domains";
import { sum } from "@/domains/helpers";
import { Card, RISK_BAR, RiskBadge } from "./ui";

const LEVELS: Risk[] = ["high", "medium", "low"];

export function RiskBreakdown({ domain, assessments }: { domain: Domain; assessments: Assessment[] }) {
  const groups = LEVELS.map((risk) => {
    const items = assessments.filter((a) => a.risk === risk);
    return { risk, count: items.length, value: sum(items.map((a) => a.value)) };
  });

  const maxValue = Math.max(...groups.map((g) => g.value), 1);

  return (
    <Card title="Risk breakdown">
      <div className="flex h-3 overflow-hidden rounded-full bg-zinc-100">
        {groups.map((g) =>
          g.count ? (
            <div key={g.risk} className={RISK_BAR[g.risk]} style={{ width: `${(g.count / assessments.length) * 100}%` }} />
          ) : null,
        )}
      </div>

      <div className="mt-5 space-y-3">
        {groups.map((g) => (
          <div key={g.risk} className="grid grid-cols-[96px_1fr_auto] items-center gap-3 text-sm">
            <RiskBadge risk={g.risk} label={`${g.count} ${g.risk}`} />
            <div className="h-2 rounded-full bg-zinc-100">
              <div className={`h-2 rounded-full ${RISK_BAR[g.risk]}`} style={{ width: `${(g.value / maxValue) * 100}%` }} />
            </div>
            <span className="text-zinc-600 tabular-nums">{domain.formatValue(g.value)}</span>
          </div>
        ))}
      </div>

      <p className="mt-4 text-xs text-zinc-500">Bars show {domain.valueLabel.toLowerCase()} at each risk level.</p>
    </Card>
  );
}
