import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from '../src/apilib/cors';
import { getPool } from '../src/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req as any, res as any)) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const start = Date.now();
  let dbOk = false;
  let dbLatencyMs: number | null = null;

  try {
    const pool = getPool();
    const dbStart = Date.now();
    await pool.query('SELECT 1');
    dbLatencyMs = Date.now() - dbStart;
    dbOk = true;
  } catch {
    dbOk = false;
  }

  const status = dbOk ? 'ok' : 'degraded';
  const httpStatus = dbOk ? 200 : 503;

  return res.status(httpStatus).json({
    status,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    responseTimeMs: Date.now() - start,
    services: {
      database: {
        status: dbOk ? 'ok' : 'error',
        latencyMs: dbLatencyMs,
      },
    },
    version: process.env.npm_package_version || '0.0.1',
    env: process.env.NODE_ENV || 'production',
  });
}
