import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from '../_lib/cors';
import { authenticateRequest } from '../_lib/auth';
import { readBody, nowTimestamp } from '../_lib/helpers';
import { getMemberById, insertReminderLog, nextLogId } from '../_lib/db';
import type { ReminderLog } from '../../src/types';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req as any, res as any)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const payload = authenticateRequest(req as any);
  if (!payload) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const { memberId, type, customMessage } = await readBody(req as any);

    const member = await getMemberById(memberId);
    if (!member) return res.status(404).json({ error: 'Member not found' });

    let msg: string = customMessage;
    if (!msg) {
      switch (type) {
        case 'Fee Reminder':
          msg = `Dear ${member.name}, your remaining balance of ₹${member.remainingBalance} for Armstrong Gym is due. Kindly make payment at your earliest convenience. Thank you!`;
          break;
        case 'Expiry Reminder':
          msg = `Dear ${member.name}, your Armstrong Gym membership expires on ${member.expiryDate}. Renew now to continue uninterrupted workouts!`;
          break;
        case 'Expired Notice':
          msg = `Dear ${member.name}, your Armstrong Gym membership expired on ${member.expiryDate}. Please renew your plan to reactivate access.`;
          break;
        default:
          msg = `Hello ${member.name}, greetings from Armstrong Gym! We hope you are having a great training session.`;
      }
    }

    const now = nowTimestamp();
    const logId = await nextLogId();
    const log: ReminderLog = {
      id: logId,
      memberId: member.id,
      memberName: member.name,
      phone: member.phone,
      type: type || 'Custom',
      message: msg,
      sentAt: now,
      status: 'Sent',
    };

    await insertReminderLog(log);

    const whatsappUrl = `https://wa.me/${member.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(msg)}`;

    return res.status(200).json({ success: true, log, whatsappUrl });
  } catch (err: any) {
    console.error('[whatsapp/send]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
