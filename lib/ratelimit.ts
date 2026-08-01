import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * 10 AI calls per workspace per hour (plan §4.2). Falls back to a simple
 * in-memory window when Upstash is not configured (local dev).
 */

const WINDOW_MS = 60 * 60 * 1000;
const LIMIT = 10;

const memoryHits = new Map<string, number[]>();

let upstash: Ratelimit | null = null;
const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;
if (url && token && !url.includes("replace-me")) {
  upstash = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(LIMIT, "1 h"),
    prefix: "panelflo:ai",
  });
}

export async function checkAiRateLimit(
  workspaceId: string
): Promise<{ allowed: boolean; remaining: number }> {
  if (upstash) {
    const res = await upstash.limit(workspaceId);
    return { allowed: res.success, remaining: res.remaining };
  }

  const now = Date.now();
  const hits = (memoryHits.get(workspaceId) ?? []).filter(
    (t) => now - t < WINDOW_MS
  );
  if (hits.length >= LIMIT) {
    memoryHits.set(workspaceId, hits);
    return { allowed: false, remaining: 0 };
  }
  hits.push(now);
  memoryHits.set(workspaceId, hits);
  return { allowed: true, remaining: LIMIT - hits.length };
}
