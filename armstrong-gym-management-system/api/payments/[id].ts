import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from '../_lib/cors';
import { authenticateRequest } from '../_lib/auth';
import { nowTimestamp } from '../_lib/helpers';
import {
  getPaymentById, deletePaymentRecord, updatePaymentRecord,
  getMemberById, updateMemberRecord,
  insertReminderLog, nextLogId,
} from '../_lib/db';
import type { ReminderLog } from '../../src/types';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req as any, res as any)) return;

  const payload = authenticateRequest(req as any);
  if (!payload) return res.status(401).json({ error: 'Unauthorized' });

  const { id } = req.query as { id: string };

  // DELETE /api/payments/:id
  if (req.method === 'DELETE') {
    try {
      const payment = await deletePaymentRecord(id);
      if (!payment) return res.status(404).json({ error: 'Payment record not found' });

      // Reverse balance on member
      const member = await getMemberById(payment.memberId);
      if (member && payment.verificationStatus === 'Verified') {
        const newPaid = Math.max(0, Number(member.amountPaid) - Number(payment.amount));
        const newBalance = Math.max(0, Number(member.planCost) - newPaid);
        await updateMemberRecord(member.id, { amountPaid: newPaid, remainingBalance: newBalance });
      }

      return res.status(200).json({ success: true, message: 'Payment deleted & member balance recalculated' });
    } catch (err: any) {
      console.error('[payments/:id DELETE]', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
