import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from './_lib/cors';
import { authenticateRequest } from './_lib/auth';
import { readBody, nowTimestamp, calcMemberStatus } from './_lib/helpers';
import { getMemberById, getMembers, getReminderLogs, insertReminderLog, nextLogId } from './_lib/db';
import type { ReminderLog } from '../src/types';

/**
 * Consolidated whatsapp handler.
 * Routes:
 *   POST /api/whatsapp/send                → send single WhatsApp message
 *   GET  /api/whatsapp/logs                → fetch reminder logs
 *   POST /api/whatsapp/batch-send-unpaid   → batch send to all unpaid members
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req as any, res as any)) return;

  const payload = authenticateRequest(req as any);
  if (!payload) return res.status(401).json({ error: 'Unauthorized' });

  const url = (req.url || '').split('?')[0];

  // ── GET /api/whatsapp/logs ────────────────────────────────────────────────────
  if (url.includes('/logs') && req.method === 'GET') {
    try {
      return res.status(200).json(await getReminderLogs());
    } catch (err: any) {
      console.error('[whatsapp/logs]', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // ── POST /api/whatsapp/send ───────────────────────────────────────────────────
  if (url.includes('/send') && req.method === 'POST') {
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

  // ── POST /api/whatsapp/batch-send-unpaid ─────────────────────────────────────
  if (url.includes('/batch-send-unpaid') && req.method === 'POST') {
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
        const msg: string = customTemplate
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

  return res.status(405).json({ error: 'Method not allowed' });
}
