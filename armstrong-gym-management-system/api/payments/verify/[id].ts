import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from '../../_lib/cors';
import { authenticateRequest } from '../../_lib/auth';
import { nowTimestamp } from '../../_lib/helpers';
import {
  getPaymentById, updatePaymentRecord,
  getMemberById, updateMemberRecord,
  insertReminderLog, nextLogId,
} from '../../_lib/db';
import type { ReminderLog } from '../../../src/types';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req as any, res as any)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const payload = authenticateRequest(req as any);
  if (!payload) return res.status(401).json({ error: 'Unauthorized' });

  const { id } = req.query as { id: string };

  try {
    const payment = await getPaymentById(id);
    if (!payment) return res.status(404).json({ error: 'Payment record not found' });

    const member = await getMemberById(payment.memberId);
    if (!member) return res.status(404).json({ error: 'Member associated with payment not found' });

    const now = nowTimestamp();

    // Only apply balance change if it wasn't already verified
    if (payment.verificationStatus !== 'Verified') {
      const newPaid = Number(member.amountPaid) + Number(payment.amount);
      const newBalance = Math.max(0, Number(member.planCost) - newPaid);
      await updateMemberRecord(member.id, { amountPaid: newPaid, remainingBalance: newBalance });
    }

    await updatePaymentRecord(id, {
      verificationStatus: 'Verified',
      verifiedBy: 'Armstrong Admin',
      verifiedAt: now,
    });

    const updatedPayment = await getPaymentById(id);
    const updatedMember = await getMemberById(payment.memberId);

    const receiptMsg = `Dear ${member.name}, your transaction payment of ₹${payment.amount} (Ref: ${payment.transactionId || payment.id}) has been VERIFIED & UPDATED on the Armstrong Gym Portal! Remaining Balance: ₹${updatedMember?.remainingBalance ?? 0}. Thank you!`;

    const logId = await nextLogId();
    const log: ReminderLog = {
      id: logId,
      memberId: member.id,
      memberName: member.name,
      phone: member.phone,
      type: 'Custom',
      message: receiptMsg,
      sentAt: now,
      status: 'Sent',
    };
    await insertReminderLog(log);

    const whatsappUrl = `https://wa.me/${member.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(receiptMsg)}`;

    return res.status(200).json({
      success: true,
      payment: updatedPayment,
      member: updatedMember,
      receiptMsg,
      whatsappUrl,
    });
  } catch (err: any) {
    console.error('[payments/verify/:id]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
