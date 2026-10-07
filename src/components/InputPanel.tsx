"use client";

import { useState } from "react";
import type { Domain } from "@/domains";
import { download, sampleCSV } from "@/lib/csv";
import { readUpload } from "@/lib/files";
import type { PipelineInput } from "@/lib/usePipeline";
import { Card, Pill } from "./ui";

type Tab = "sample" | "upload" | "paste";

type Upload = { input: PipelineInput; name: string; preview: string | null };

export function InputPanel({
  domain,
  running,
  onRun,
}: {
  domain: Domain;
  running: boolean;
  onRun: (input: PipelineInput) => void;
}) {
  const [tab, setTab] = useState<Tab>("sample");
  const [text, setText] = useState("");
  const [upload, setUpload] = useState<Upload | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file?: File) {
    if (!file) return;
    setError(null);

    try {
      if (file.name.toLowerCase().endsWith(".csv")) {
        setUpload({ input: { kind: "csv", text: await file.text(), name: file.name }, name: file.name, preview: null });
      } else if (file.type.startsWith("image/") || file.type === "application/pdf") {
        const { attachment, preview } = await readUpload(file);
        setUpload({ input: { kind: "file", file: attachment, name: file.name }, name: file.name, preview });
      } else {
        setError("Use a CSV, a JPG/PNG photo or a PDF.");
      }
    } catch {
      setError("Could not read that file. Try a JPG or PNG.");
    }
  }

  const input: PipelineInput | null =
    tab === "sample"
      ? { kind: "sample" }
      : tab === "upload"
        ? (upload?.input ?? null)
        : text.trim()
          ? { kind: "text", text }
          : null;

  return (
    <Card title="1 · Data in">
      <div className="mb-4 flex gap-2">
        <Pill active={tab === "sample"} onClick={() => setTab("sample")}>Sample data</Pill>
        <Pill active={tab === "upload"} onClick={() => setTab("upload")}>Upload</Pill>
        <Pill active={tab === "paste"} onClick={() => setTab("paste")}>Paste text</Pill>
      </div>

      {tab === "sample" && (
        <div className="rounded-xl bg-zinc-50 p-4 text-sm text-zinc-600">
          <p>
            {domain.sample.length} realistic {domain.entityPlural} from a typical {domain.audience.replace(/^an? /, "")}.
          </p>
          <button
            type="button"
            onClick={() => download(`${domain.id}-sample.csv`, sampleCSV(domain))}
            className="mt-2 text-xs font-medium text-brand hover:underline"
          >
            Download as CSV
          </button>
        </div>
      )}

      {tab === "upload" && (
        <label
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            handleFile(e.dataTransfer.files[0]);
          }}
          className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-zinc-200 p-5 text-center text-sm text-zinc-500 transition hover:border-brand/50 hover:bg-brand/5"
        >
          <input
            type="file"
            accept=".csv,image/*,application/pdf"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          {upload?.preview && (
            <img src={upload.preview} alt="Uploaded file preview" className="max-h-40 rounded-lg object-contain" />
          )}
          <p className="font-medium text-zinc-700">{upload ? upload.name : "Drop a file or click to choose"}</p>
          <p className="text-xs">{domain.photoHint}, a CSV, or a PDF</p>
        </label>
      )}

      {tab === "paste" && (
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={7}
          placeholder="Paste anything: notes, a WhatsApp message, rows copied from Excel…"
          className="w-full resize-y rounded-xl border border-zinc-200 p-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
      )}

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <button
        type="button"
        disabled={!input || running}
        onClick={() => input && onRun(input)}
        className="mt-4 w-full rounded-xl bg-brand px-4 py-3 font-semibold text-white shadow-sm transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {running ? "Running…" : "Run AI pipeline"}
      </button>
    </Card>
  );
}
