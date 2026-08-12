import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from '../_lib/cors';
import { readBody, nowTimestamp } from '../_lib/helpers';
import { getMembers, insertPayment, nextPaymentId } from '../_lib/db';
import type { Payment } from '../../src/types';

// Public route — no auth required (member self-service bill upload)
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req as any, res as any)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { memberQuery, amount, paymentMethod, transactionId, billUrl, notes }
      = await readBody(req as any);

    const query = (memberQuery || '').trim().toLowerCase();
    if (!query) return res.status(400).json({ success: false, error: 'memberQuery is required' });

    const members = await getMembers();
    const member = members.find(
      (m) =>
        m.id.toLowerCase() === query ||
        m.phone.replace(/\s/g, '').includes(query.replace(/\s/g, '')) ||
        m.name.toLowerCase().includes(query)
    );

    if (!member) {
      return res.status(404).json({ success: false, error: 'Member ID, phone, or name not found in system' });
    }

    const paymentAmount = Number(amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      return res.status(400).json({ success: false, error: 'Please enter a valid amount' });
    }

    const payId = await nextPaymentId();
    const now = nowTimestamp();

    const newPayment: Payment = {
      id: payId,
      memberId: member.id,
      memberName: member.name,
      amount: paymentAmount,
      paymentMethod: paymentMethod || 'UPI',
      date: now,
      transactionId: transactionId || `UTR-${Date.now().toString().slice(-8)}`,
      billUrl: billUrl || '',
      verificationStatus: 'Pending Verification',
      notes: notes || 'Submitted via Member Bill Upload Portal',
    };

    await insertPayment(newPayment);

    return res.status(201).json({
      success: true,
      message: `Transaction bill of ₹${paymentAmount} submitted! Gym admin will verify and update your portal record.`,
      payment: newPayment,
    });
  } catch (err: any) {
    console.error('[payments/submit-bill]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
