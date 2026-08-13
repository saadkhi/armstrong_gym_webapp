import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from '../src/apilib/cors';
import { authenticateRequest } from '../src/apilib/auth';
import { readBody, todayStr } from '../src/apilib/helpers';
import { getExpenses, insertExpense, nextExpenseId, deleteExpenseRecord } from '../src/apilib/db';
import type { Expense } from '../src/types';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req as any, res as any)) return;

  const payload = authenticateRequest(req as any);
  if (!payload) return res.status(401).json({ error: 'Unauthorized' });

  // _id injected by vercel.json rewrite
  const id = (req.query._id as string) || '';

  // ── Collection routes ─────────────────────────────────────────────────────────
  if (!id) {
    if (req.method === 'GET') {
      try {
        return res.status(200).json(await getExpenses());
      } catch (err: any) {
        console.error('[expenses GET]', err);
        return res.status(500).json({ error: 'Internal server error' });
      }
    }

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

  // ── Single-resource routes ─────────────────────────────────────────────────────
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
