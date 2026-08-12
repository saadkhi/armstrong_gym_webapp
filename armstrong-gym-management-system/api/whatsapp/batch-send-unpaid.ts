import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from '../_lib/cors';
import { authenticateRequest } from '../_lib/auth';
import { readBody, nowTimestamp, calcMemberStatus } from '../_lib/helpers';
import { getMembers, insertReminderLog, nextLogId } from '../_lib/db';
import type { ReminderLog } from '../../src/types';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req as any, res as any)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const payload = authenticateRequest(req as any);
  if (!payload) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const { targetMemberIds, customTemplate } = await readBody(req as any);

    const allMembers = await getMembers();
    let unpaid = allMembers.filter((m) => Number(m.remainingBalance) > 0);
    if (Array.isArray(targetMemberIds) && targetMemberIds.length > 0) {
      unpaid = unpaid.filter((m) => targetMemberIds.includes(m.id));
    }

    if (unpaid.length === 0) {
      return res.status(200).json({
        success: true, count: 0,
        message: 'No unpaid clients found matching criteria.',
        dispatchList: [],
      });
    }

    const now = nowTimestamp();
    const dispatchList: any[] = [];

    for (const m of unpaid) {
      let msg: string = customTemplate
        ? customTemplate
            .replace(/{Name}/g, m.name)
            .replace(/{Balance}/g, String(m.remainingBalance))
            .replace(/{Plan}/g, m.planType)
            .replace(/{Expiry}/g, m.expiryDate)
        : `Dear ${m.name}, your Armstrong Gym fee balance of ₹${m.remainingBalance} for your ${m.planType} plan is pending. Please make your payment via UPI or Cash and submit the transaction receipt to gym admin. Thank you!`;

      const logId = await nextLogId();
      const log: ReminderLog = {
        id: logId,
        memberId: m.id,
        memberName: m.name,
        phone: m.phone,
        type: 'Fee Reminder',
        message: msg,
        sentAt: now,
        status: 'Sent',
      };
      await insertReminderLog(log);

      const cleanPhone = m.phone.replace(/[^0-9]/g, '');
      dispatchList.push({
        memberId: m.id,
        memberName: m.name,
        phone: m.phone,
        remainingBalance: m.remainingBalance,
        message: msg,
        whatsappUrl: `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`,
        logId,
      });
    }

    return res.status(200).json({
      success: true,
      count: dispatchList.length,
      message: `Generated & logged WhatsApp messages for ${dispatchList.length} unpaid clients!`,
      dispatchList,
    });
  } catch (err: any) {
    console.error('[whatsapp/batch-send-unpaid]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
