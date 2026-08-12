import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from '../_lib/cors';
import { authenticateRequest } from '../_lib/auth';
import { getReminderLogs } from '../_lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req as any, res as any)) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const payload = authenticateRequest(req as any);
  if (!payload) return res.status(401).json({ error: 'Unauthorized' });

  try {
    return res.status(200).json(await getReminderLogs());
  } catch (err: any) {
    console.error('[whatsapp/logs]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
