import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const DIR = path.join(process.cwd(), ".ai-cache");

export function cacheKey(...parts: unknown[]) {
  return createHash("sha256").update(JSON.stringify(parts)).digest("hex").slice(0, 32);
}

export async function readCache<T>(key: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(path.join(DIR, `${key}.json`), "utf8"));
  } catch {
    return null;
  }
}

export async function writeCache(key: string, data: unknown) {
  try {
    await mkdir(DIR, { recursive: true });
    await writeFile(path.join(DIR, `${key}.json`), JSON.stringify(data, null, 2));
  } catch {}
}
