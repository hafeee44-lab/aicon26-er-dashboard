import type { Domain, Row } from "@/domains";
import { normalizeRows } from "./normalize";

export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];

    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') {
        quoted = false;
      } else {
        cell += c;
      }
    } else if (c === '"') {
      quoted = true;
    } else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += c;
    }
  }

  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }

  return rows.filter((r) => r.some((c) => c.trim()));
}

const simplify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

export function csvToRows(domain: Domain, text: string): Row[] | null {
  const [header, ...body] = parseCSV(text);
  if (!header || !body.length) return null;

  const columns = domain.fields.map((f) =>
    header.findIndex((h) => [simplify(f.key), simplify(f.label)].includes(simplify(h))),
  );

  const matched = columns.filter((i) => i >= 0).length;
  if (matched < Math.ceil(domain.fields.length / 2)) return null;

  const raw = body.map((cells) =>
    Object.fromEntries(domain.fields.map((f, j) => [f.key, columns[j] >= 0 ? cells[columns[j]] : null])),
  );

  return normalizeRows(domain, raw);
}

export function toCSV(table: unknown[][]) {
  return table
    .map((row) =>
      row
        .map((v) => {
          const s = v === null || v === undefined ? "" : String(v);
          return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(","),
    )
    .join("\n");
}

export function download(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function sampleCSV(domain: Domain) {
  return toCSV([
    domain.fields.map((f) => f.label),
    ...domain.sample.map((r) => domain.fields.map((f) => r[f.key])),
  ]);
}
