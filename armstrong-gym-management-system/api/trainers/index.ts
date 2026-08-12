import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from '../_lib/cors';
import { authenticateRequest } from '../_lib/auth';
import { readBody, todayStr } from '../_lib/helpers';
import { getTrainers, insertTrainer, nextTrainerId, getMembers } from '../_lib/db';
import type { Trainer } from '../../src/types';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req as any, res as any)) return;

  const payload = authenticateRequest(req as any);
  if (!payload) return res.status(401).json({ error: 'Unauthorized' });

  // GET /api/trainers
  if (req.method === 'GET') {
    try {
      const [trainers, members] = await Promise.all([getTrainers(), getMembers()]);
      const result = trainers.map((t) => ({
        ...t,
        assignedMembersCount: members.filter((m) => m.trainerId === t.id).length,
      }));
      return res.status(200).json(result);
    } catch (err: any) {
      console.error('[trainers GET]', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // POST /api/trainers
  if (req.method === 'POST') {
    try {
      const { name, phone, email, specialty, salary, shift, status, joiningDate }
        = await readBody(req as any);

      if (!name) return res.status(400).json({ error: 'name is required' });

      const id = await nextTrainerId();
      const newTrainer: Trainer = {
        id,
        name,
        phone: phone || '',
        email: email || '',
        specialty: specialty || 'Fitness & Conditioning',
        salary: Number(salary) || 30000,
        shift: shift || 'Morning',
        status: status || 'Active',
        joiningDate: joiningDate || todayStr(),
        assignedMembersCount: 0,
      };

      await insertTrainer(newTrainer);
      return res.status(201).json(newTrainer);
    } catch (err: any) {
      console.error('[trainers POST]', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
