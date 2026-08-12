import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from '../_lib/cors';
import { authenticateRequest } from '../_lib/auth';
import { readBody, nowTimestamp } from '../_lib/helpers';
import {
  getPayments, insertPayment, nextPaymentId,
  getMemberById, updateMemberRecord,
} from '../_lib/db';
import type { Payment } from '../../src/types';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req as any, res as any)) return;

  const payload = authenticateRequest(req as any);
  if (!payload) return res.status(401).json({ error: 'Unauthorized' });

  // GET /api/payments
  if (req.method === 'GET') {
    try {
      return res.status(200).json(await getPayments());
    } catch (err: any) {
      console.error('[payments GET]', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // POST /api/payments
  if (req.method === 'POST') {
    try {
      const { memberId, amount, paymentMethod, notes, transactionId, billUrl, verificationStatus }
        = await readBody(req as any);

      const member = await getMemberById(memberId);
      if (!member) return res.status(404).json({ error: 'Member not found' });

      const paymentAmount = Number(amount);
      if (isNaN(paymentAmount) || paymentAmount <= 0) {
        return res.status(400).json({ error: 'Invalid payment amount' });
      }

      const now = nowTimestamp();
      const status = verificationStatus || 'Verified';
      const payId = await nextPaymentId();

      const newPayment: Payment = {
        id: payId,
        memberId: member.id,
        memberName: member.name,
        amount: paymentAmount,
        paymentMethod: paymentMethod || 'Cash',
        date: now,
        transactionId: transactionId || `TXN-${Date.now().toString().slice(-6)}`,
        billUrl: billUrl || '',
        verificationStatus: status,
        verifiedBy: status === 'Verified' ? 'Armstrong Admin' : undefined,
        verifiedAt: status === 'Verified' ? now : undefined,
        notes: notes || '',
      };

      await insertPayment(newPayment);

      // Update member balance if verified immediately
      let updatedMember = member;
      if (status === 'Verified') {
        const newPaid = Number(member.amountPaid) + paymentAmount;
        const newBalance = Math.max(0, Number(member.planCost) - newPaid);
        updatedMember = (await updateMemberRecord(member.id, {
          amountPaid: newPaid,
          remainingBalance: newBalance,
        })) ?? member;
      }

      return res.status(201).json({ payment: newPayment, member: updatedMember });
    } catch (err: any) {
      console.error('[payments POST]', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
