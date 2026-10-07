export type DomainId = "example";

export type Field = {
  key: string;
  label: string;
  type: "text" | "number" | "date";
  unit?: string;
  hint?: string;
};

export type Value = string | number | null;

export type Row = { id: string; [key: string]: Value };

export type Risk = "high" | "medium" | "low";

export type Assessment = {
  id: string;
  risk: Risk;
  score: number;
  reason: string;
  action: string;
  value: number;
  message?: string;
  source: "ai" | "rules";
};

export type RuleResult = Omit<Assessment, "id" | "source">;

export type Metric = {
  label: string;
  value: string;
  hint: string;
};

export type Domain = {
  id: DomainId;
  product: string;
  domainName: string;
  tagline: string;
  problem: string;
  sdg: { number: number; title: string };
  accent: string;
  audience: string;
  entity: string;
  entityPlural: string;
  photoHint: string;
  titleKey: string;
  fields: Field[];
  sample: Omit<Row, "id">[];
  analysis: string;
  facts?: (row: Row) => Record<string, Value>;
  message?: string;
  valueLabel: string;
  formatValue: (n: number) => string;
  rules: (row: Row) => RuleResult;
  impact: (rows: Row[], assessments: Assessment[]) => Metric[];
};
