import { example } from "./example";
import type { Domain, DomainId, Row } from "./types";

export * from "./types";

export const domains: Record<DomainId, Domain> = { example };

export function getDomain(id: unknown): Domain | null {
  return typeof id === "string" && Object.hasOwn(domains, id) ? domains[id as DomainId] : null;
}

export const defaultDomainId: DomainId = getDomain(process.env.NEXT_PUBLIC_DOMAIN)?.id ?? "example";

export function sampleRows(domain: Domain): Row[] {
  return domain.sample.map((r, i) => ({ ...r, id: `r${i + 1}` }));
}
