import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from './_lib/cors';
import { authenticateRequest } from './_lib/auth';
import { readBody, todayStr } from './_lib/helpers';
import { getTrainers, insertTrainer, nextTrainerId, getMembers, updateTrainerRecord, deleteTrainerRecord } from './_lib/db';
import type { Trainer } from '../src/types';

/**
 * Consolidated trainers handler.
 * Routes:
 *   GET    /api/trainers        → list all
 *   POST   /api/trainers        → create
 *   PUT    /api/trainers/:id    → update
 *   DELETE /api/trainers/:id    → delete
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req as any, res as any)) return;

  const payload = authenticateRequest(req as any);
  if (!payload) return res.status(401).json({ error: 'Unauthorized' });

  const url = (req.url || '').split('?')[0];
  const parts = url.replace(/^\/api\/trainers\/?/, '').split('/').filter(Boolean);
  const id = parts[0] || (req.query.id as string) || '';

  // ── Collection routes ─────────────────────────────────────────────────────────
  if (!id) {
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

        const newId = await nextTrainerId();
        const newTrainer: Trainer = {
          id: newId,
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

  // ── Single-resource routes ────────────────────────────────────────────────────

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
