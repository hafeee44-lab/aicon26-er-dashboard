import { readCache, writeCache, cacheKey } from "./cache";
import { aiConfig } from "./config";
import { AIError, callProvider, type AIRequest } from "./providers";

export { aiConfig } from "./config";
export { AIError, type AIRequest, type Attachment } from "./providers";

export type AIResult<T> = {
  data: T;
  model: string;
  cached: boolean;
  ms: number;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const isRetryable = (e: unknown) => e instanceof AIError && [408, 500, 502, 504].includes(e.status);

function parseJSON(text: string) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");

  if (start === -1 || end < start) {
    throw new AIError("The AI did not return JSON", 502);
  }

  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    throw new AIError("The AI returned broken JSON", 502);
  }
}

const CACHE_VERSION = 2;

type Options = { cache?: boolean; timeLimitMs?: number };

export async function generateJSON<T>(req: AIRequest, options: Options = {}): Promise<AIResult<T>> {
  const cfg = aiConfig();
  const started = Date.now();
  const limit = options.timeLimitMs ?? cfg.timeLimitMs;
  const deadline = started + limit;
  const timeUp = () => new AIError(`The AI took longer than ${Math.round(limit / 1000)} seconds`, 504);

  if (!cfg.ready) {
    throw new AIError(`No API key set for ${cfg.provider}. Add it to .env.local`, 401);
  }

  const key = cacheKey(CACHE_VERSION, cfg.provider, cfg.model, req);

  if (cfg.cache && options.cache !== false) {
    const hit = await readCache<{ model: string; data: T }>(key);
    if (hit) return { data: hit.data, model: hit.model, cached: true, ms: Date.now() - started };
  }

  const models = [cfg.model, cfg.fallbackModel].filter(Boolean);
  let lastError: unknown;

  for (const [i, model] of models.entries()) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const left = deadline - Date.now();
      if (left <= 0) throw timeUp();

      try {
        const data = parseJSON(await callProvider(cfg, model, req, left / (models.length - i))) as T;
        if (cfg.cache) await writeCache(key, { model, data });
        return { data, model, cached: false, ms: Date.now() - started };
      } catch (e) {
        lastError = e;
        if (!isRetryable(e)) break;
        await sleep(Math.min(1200 * (attempt + 1), Math.max(0, deadline - Date.now())));
      }
    }
  }

  throw Date.now() >= deadline ? timeUp() : lastError;
}
