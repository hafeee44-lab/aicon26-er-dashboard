import type { Attachment } from "@/lib/types";

export const MAX_FILES = 4;
const MAX_FILE_CHARS = 6_000_000;

const validFile = (f: unknown): f is Attachment => {
  const file = f as Attachment;
  return (
    typeof file?.mimeType === "string" &&
    (file.mimeType.startsWith("image/") || file.mimeType === "application/pdf") &&
    typeof file.data === "string" &&
    file.data.length <= MAX_FILE_CHARS
  );
};

export function cleanFiles(value: unknown): Attachment[] {
  return Array.isArray(value) ? value.filter(validFile).slice(0, MAX_FILES) : [];
}
