import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from './_lib/cors';
import { authenticateRequest } from './_lib/auth';
import { readBody, todayStr } from './_lib/helpers';
import { getExpenses, insertExpense, nextExpenseId, deleteExpenseRecord } from './_lib/db';
import type { Expense } from '../src/types';

/**
 * Consolidated expenses handler.
 * Routes:
 *   GET    /api/expenses        → list all
 *   POST   /api/expenses        → create
 *   DELETE /api/expenses/:id    → delete
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req as any, res as any)) return;

  const payload = authenticateRequest(req as any);
  if (!payload) return res.status(401).json({ error: 'Unauthorized' });

  const url = (req.url || '').split('?')[0];
  const parts = url.replace(/^\/api\/expenses\/?/, '').split('/').filter(Boolean);
  const id = parts[0] || (req.query.id as string) || '';

  // ── Collection routes ─────────────────────────────────────────────────────────
  if (!id) {
    // GET /api/expenses
    if (req.method === 'GET') {
      try {
        return res.status(200).json(await getExpenses());
      } catch (err: any) {
        console.error('[expenses GET]', err);
        return res.status(500).json({ error: 'Internal server error' });
      }
    }

    // POST /api/expenses
    if (req.method === 'POST') {
      try {
        const { title, amount, category, date, notes } = await readBody(req as any);
        if (!title) return res.status(400).json({ error: 'title is required' });

        const newId = await nextExpenseId();
        const newExpense: Expense = {
          id: newId,
          title,
          amount: Number(amount) || 0,
          category: category || 'Misc',
          date: date || todayStr(),
          notes: notes || '',
        };

        await insertExpense(newExpense);
        return res.status(201).json(newExpense);
      } catch (err: any) {
        console.error('[expenses POST]', err);
        return res.status(500).json({ error: 'Internal server error' });
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ── Single-resource routes ────────────────────────────────────────────────────

  // DELETE /api/expenses/:id
  if (req.method === 'DELETE') {
    try {
      await deleteExpenseRecord(id);
      return res.status(200).json({ success: true, message: 'Expense deleted' });
    } catch (err: any) {
      console.error('[expenses/:id DELETE]', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
