import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from '../_lib/cors';
import { authenticateRequest } from '../_lib/auth';
import { getAdminById } from '../_lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req as any, res as any)) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const payload = authenticateRequest(req as any);
  if (!payload) return res.status(401).json({ success: false, error: 'Unauthorized' });

  try {
    const admin = await getAdminById(payload.sub);
    if (!admin) return res.status(404).json({ success: false, error: 'Admin not found' });
    return res.status(200).json({ success: true, user: admin });
  } catch (err: any) {
    console.error('[auth/me]', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
