import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from '../_lib/cors';
import { authenticateRequest } from '../_lib/auth';
import { readBody } from '../_lib/helpers';
import { updateTrainerRecord, deleteTrainerRecord } from '../_lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req as any, res as any)) return;

  const payload = authenticateRequest(req as any);
  if (!payload) return res.status(401).json({ error: 'Unauthorized' });

  const { id } = req.query as { id: string };

  // PUT /api/trainers/:id
  if (req.method === 'PUT') {
    try {
      const body = await readBody(req as any);
      const updated = await updateTrainerRecord(id, body);
      if (!updated) return res.status(404).json({ error: 'Trainer not found' });
      return res.status(200).json(updated);
    } catch (err: any) {
      console.error('[trainers/:id PUT]', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // DELETE /api/trainers/:id
  if (req.method === 'DELETE') {
    try {
      await deleteTrainerRecord(id);
      return res.status(200).json({ success: true, message: 'Trainer deleted' });
    } catch (err: any) {
      console.error('[trainers/:id DELETE]', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
