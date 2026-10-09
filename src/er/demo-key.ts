import { createHash } from "node:crypto";
import type { Attachment } from "@/lib/types";

export function demoKey(note: string, files: Attachment[] = []) {
  return createHash("sha256")
    .update(JSON.stringify([note.trim(), files.map((f) => f.data)]))
    .digest("hex")
    .slice(0, 32);
}
