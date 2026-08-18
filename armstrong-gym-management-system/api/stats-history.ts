/**
 * GET /api/stats/history?months=6
 * Returns last N months of income + expenses aggregated from DB.
 * Requires admin auth.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from '../src/apilib/cors';
import { authenticateRequest } from '../src/apilib/auth';
import { getMonthlyHistory, ensureDb } from '../src/apilib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req as any, res as any)) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  await ensureDb();

  const payload = authenticateRequest(req as any);
  if (!payload) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const months = Math.min(24, Math.max(1, parseInt((req.query.months as string) || '6', 10)));
    const history = await getMonthlyHistory(months);
    return res.status(200).json(history);
  } catch (err: any) {
    console.error('[stats/history]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
