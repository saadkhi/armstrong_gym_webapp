import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors }          from '../src/apilib/cors';
import { authenticateRequest } from '../src/apilib/auth';
import { getStatsFromDb, ensureDb } from '../src/apilib/db';
import { getCache, setCache, CACHE_KEYS } from '../src/lib/cache';
import type { SystemStats } from '../src/types';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req as any, res as any)) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  await ensureDb();

  const payload = authenticateRequest(req as any);
  if (!payload) return res.status(401).json({ error: 'Unauthorized' });

  try {
    // Try cache first (30-second TTL)
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
