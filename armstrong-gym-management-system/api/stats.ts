/**
 * GET /api/stats          — current dashboard stats (cached 30s)
 * GET /api/stats/history  — last N months of income/expense history
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors }           from '../src/apilib/cors';
import { authenticateRequest } from '../src/apilib/auth';
import { getStatsFromDb, getMonthlyHistory, ensureDb } from '../src/apilib/db';
import { getCache, setCache, CACHE_KEYS } from '../src/lib/cache';
import type { SystemStats } from '../src/types';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req as any, res as any)) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  await ensureDb();

  const payload = authenticateRequest(req as any);
  if (!payload) return res.status(401).json({ error: 'Unauthorized' });

  // _route=history → historical monthly data
  const route = (req.query._route as string) || '';

  if (route === 'history') {
    try {
      const months = Math.min(24, Math.max(1, parseInt((req.query.months as string) || '6', 10)));
      const cacheKey = `${CACHE_KEYS.STATS_HISTORY}:${months}`;
      const cached = await getCache(cacheKey);
      if (cached) {
        res.setHeader('X-Cache', 'HIT');
        return res.status(200).json(cached);
      }
      const history = await getMonthlyHistory(months);
      await setCache(cacheKey, history, 60); // 60s TTL for history
      res.setHeader('X-Cache', 'MISS');
      return res.status(200).json(history);
    } catch (err: any) {
      console.error('[stats/history]', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Default → current stats
  try {
    const cached = await getCache<SystemStats>(CACHE_KEYS.STATS);
    if (cached) {
      res.setHeader('X-Cache', 'HIT');
      return res.status(200).json(cached);
    }
    const stats = await getStatsFromDb();
    await setCache(CACHE_KEYS.STATS, stats, 30);
    res.setHeader('X-Cache', 'MISS');
    return res.status(200).json(stats);
  } catch (err: any) {
    console.error('[stats]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
