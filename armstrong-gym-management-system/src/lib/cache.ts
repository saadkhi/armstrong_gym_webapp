/**
 * Redis-backed cache for the stats endpoint.
 *
 * Required env var: REDIS_URL  (e.g. redis://localhost:6379 or a Upstash URL)
 *
 * Falls back silently to a no-op when REDIS_URL is absent so the app
 * continues to work in dev / environments without Redis.
 *
 * Usage:
 *   const cached = await getCache<SystemStats>('stats');
 *   if (cached) return cached;
 *   const fresh = await expensiveComputation();
 *   await setCache('stats', fresh, 30); // 30-second TTL
 *   return fresh;
 */

import Redis from 'ioredis';

let _client: Redis | null = null;
let _failed  = false; // once a connection error occurs, stop retrying

function getRedis(): Redis | null {
  if (_failed) return null;
  if (_client) return _client;

  const url = process.env.REDIS_URL;
  if (!url) return null;

  try {
    _client = new Redis(url, {
      // Never retry in serverless — each invocation is stateless
      maxRetriesPerRequest: 1,
      enableOfflineQueue:   false,
      lazyConnect:          true,
      connectTimeout:       3000,
    });

    _client.on('error', (err) => {
      console.warn('[cache] Redis error — disabling cache:', err.message);
      _failed  = true;
      _client  = null;
    });

    return _client;
  } catch (err: any) {
    console.warn('[cache] Redis init failed:', err.message);
    _failed = true;
    return null;
  }
}

/**
 * Read a cached value.  Returns `null` on miss, error, or no Redis.
 */
export async function getCache<T>(key: string): Promise<T | null> {
  const redis = getRedis();
  if (!redis) return null;
  try {
    const raw = await redis.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/**
 * Write a value to the cache.
 * @param key    Cache key
 * @param value  JSON-serialisable value
 * @param ttlSec Time-to-live in seconds (default 30)
 */
export async function setCache<T>(key: string, value: T, ttlSec = 30): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttlSec);
  } catch {
    // silent — cache is best-effort
  }
}

/**
 * Invalidate one or more cache keys (e.g. after a write mutation).
 */
export async function invalidateCache(...keys: string[]): Promise<void> {
  const redis = getRedis();
  if (!redis || keys.length === 0) return;
  try {
    await redis.del(...keys);
  } catch {
    // silent
  }
}

// ── Named cache keys ──────────────────────────────────────────────────────────
export const CACHE_KEYS = {
  STATS:         'armstrong:stats',
  STATS_HISTORY: 'armstrong:stats:history',
} as const;
