/**
 * Lightweight in-memory rate limiter for Vercel serverless functions.
 *
 * Works per serverless instance (warm invocations share state).
 * Cold starts reset counts — acceptable trade-off vs adding a Redis dependency.
 * For high-traffic deployments, replace the store with an Upstash Redis client.
 */

interface AttemptRecord {
  count: number;
  resetAt: number; // epoch ms when the window resets
}

const store = new Map<string, AttemptRecord>();

/**
 * Check whether the given key has exceeded the allowed rate.
 *
 * @param key       - Typically the client IP, e.g. `req.headers['x-forwarded-for']`
 * @param max       - Maximum allowed requests in the window
 * @param windowMs  - Window duration in milliseconds
 * @returns `{ limited: true, retryAfterSecs }` if rate exceeded, else `{ limited: false }`
 */
export function checkRateLimit(
  key: string,
  max: number,
  windowMs: number
): { limited: false } | { limited: true; retryAfterSecs: number } {
  const now = Date.now();

  let record = store.get(key);

  // Expired window — reset
  if (!record || now > record.resetAt) {
    record = { count: 1, resetAt: now + windowMs };
    store.set(key, record);
    return { limited: false };
  }

  record.count += 1;

  if (record.count > max) {
    const retryAfterSecs = Math.ceil((record.resetAt - now) / 1000);
    return { limited: true, retryAfterSecs };
  }

  return { limited: false };
}

/**
 * Periodically prune expired entries to prevent unbounded memory growth.
 * Safe to call on every request — only runs cleanup every 5 minutes.
 */
let lastPruned = 0;
export function pruneExpiredEntries(): void {
  const now = Date.now();
  if (now - lastPruned < 5 * 60 * 1000) return;
  lastPruned = now;
  for (const [key, record] of store.entries()) {
    if (now > record.resetAt) store.delete(key);
  }
}

/**
 * Extract the best available client IP from a Vercel/Node request.
 */
export function getClientIp(headers: Record<string, string | string[] | undefined>): string {
  const xff = headers['x-forwarded-for'];
  if (Array.isArray(xff)) return xff[0].split(',')[0].trim();
  if (typeof xff === 'string') return xff.split(',')[0].trim();
  return 'unknown';
}
