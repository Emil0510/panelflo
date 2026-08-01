import { Redis } from "@upstash/redis";

/**
 * Upstash Redis with an in-memory fallback for local development
 * without Upstash credentials. The fallback only supports the small
 * surface Panelflo uses: get / set with TTL / del.
 */

type KV = {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown, opts?: { ex?: number }): Promise<unknown>;
  del(key: string): Promise<unknown>;
};

const memory = new Map<string, { value: unknown; expiresAt: number | null }>();

const memoryKV: KV = {
  async get<T>(key: string) {
    const entry = memory.get(key);
    if (!entry) return null;
    if (entry.expiresAt !== null && entry.expiresAt < Date.now()) {
      memory.delete(key);
      return null;
    }
    return entry.value as T;
  },
  async set(key, value, opts) {
    memory.set(key, {
      value,
      expiresAt: opts?.ex ? Date.now() + opts.ex * 1000 : null,
    });
    return "OK";
  },
  async del(key) {
    return memory.delete(key) ? 1 : 0;
  },
};

function createKV(): KV {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token && !url.includes("replace-me")) {
    return new Redis({ url, token });
  }
  return memoryKV;
}

const globalForRedis = globalThis as unknown as { kv?: KV };
export const kv = globalForRedis.kv ?? createKV();
if (process.env.NODE_ENV !== "production") globalForRedis.kv = kv;
