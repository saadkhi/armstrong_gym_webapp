import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from '../_lib/cors';
import { authenticateRequest } from '../_lib/auth';
import { readBody, calcMemberStatus, calcExpiry, planDuration } from '../_lib/helpers';
import { getMemberById, updateMemberRecord, deleteMemberRecord } from '../_lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req as any, res as any)) return;

  const payload = authenticateRequest(req as any);
  if (!payload) return res.status(401).json({ error: 'Unauthorized' });

  const { id } = req.query as { id: string };

  // GET /api/members/:id
  if (req.method === 'GET') {
    try {
      const member = await getMemberById(id);
      if (!member) return res.status(404).json({ error: 'Member not found' });
      return res.status(200).json({ ...member, status: calcMemberStatus(member.expiryDate) });
    } catch (err: any) {
      console.error('[members/:id GET]', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // PUT /api/members/:id
  if (req.method === 'PUT') {
    try {
      const current = await getMemberById(id);
      if (!current) return res.status(404).json({ error: 'Member not found' });

      const body = await readBody(req as any);
      const merged = { ...current, ...body };

      // Recalculate duration & expiry if plan or start date changed
      if (body.planType || body.startDate) {
        merged.planDurationMonths = planDuration(merged.planType);
        merged.expiryDate = calcExpiry(merged.startDate, merged.planDurationMonths);
      }

      // Recalculate balance
      merged.remainingBalance = Math.max(0, Number(merged.planCost) - Number(merged.amountPaid));
      merged.status = calcMemberStatus(merged.expiryDate);

      const updated = await updateMemberRecord(id, merged);
      return res.status(200).json(updated);
    } catch (err: any) {
      console.error('[members/:id PUT]', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // DELETE /api/members/:id
  if (req.method === 'DELETE') {
    try {
      const member = await getMemberById(id);
      if (!member) return res.status(404).json({ error: 'Member not found' });
      await deleteMemberRecord(id);
      return res.status(200).json({ success: true, message: 'Member deleted successfully' });
    } catch (err: any) {
      console.error('[members/:id DELETE]', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
