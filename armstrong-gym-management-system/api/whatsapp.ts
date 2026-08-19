import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from '../src/apilib/cors';
import { authenticateRequest } from '../src/apilib/auth';
import { readBody, nowTimestamp } from '../src/apilib/helpers';
import {
  getMemberById, getMembers, getReminderLogs,
  insertReminderLog, nextLogId, getSettings, ensureDb,
} from '../src/apilib/db';
import { sendWhatsAppViaTwilio } from '../src/lib/twilio';
import type { ReminderLog } from '../src/types';

// ─── helpers ──────────────────────────────────────────────────────────────────

function buildMessage(
  memberName: string,
  remainingBalance: number,
  expiryDate: string,
  planType: string,
  type: string,
  customMessage?: string
): string {
  if (customMessage) return customMessage;
  switch (type) {
    case 'Fee Reminder':
      return `Dear ${memberName}, your remaining balance of Rs. ${remainingBalance} for Armstrong Gym is due. Kindly make payment at your earliest convenience. Thank you!`;
    case 'Expiry Reminder':
      return `Dear ${memberName}, your Armstrong Gym membership expires on ${expiryDate}. Renew now to continue uninterrupted workouts!`;
    case 'Expired Notice':
      return `Dear ${memberName}, your Armstrong Gym membership expired on ${expiryDate}. Please renew your plan to reactivate access.`;
    default:
      return `Hello ${memberName}, greetings from Armstrong Gym & Fitness Club! We hope you are having a great training session.`;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req as any, res as any)) return;
  await ensureDb();

  const payload = authenticateRequest(req as any);
  if (!payload) return res.status(401).json({ error: 'Unauthorized' });

  const route = (req.query._route as string) || '';

  // ── GET /api/whatsapp/logs ─────────────────────────────────────────────────
  if (route === 'logs' && req.method === 'GET') {
    try {
      return res.status(200).json(await getReminderLogs());
    } catch (err: any) {
      console.error('[whatsapp/logs]', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // ── POST /api/whatsapp/send ────────────────────────────────────────────────
  if (route === 'send' && req.method === 'POST') {
    try {
      const { memberId, type, customMessage } = await readBody(req as any);

      const member = await getMemberById(memberId);
      if (!member) return res.status(404).json({ error: 'Member not found' });

      const msg = buildMessage(
        member.name, member.remainingBalance, member.expiryDate,
        member.planType, type, customMessage
      );

      // Attempt real Twilio send
      const settings = await getSettings();
      const twilioResult = await sendWhatsAppViaTwilio(member.phone, msg, {
        accountSid: settings.twilioAccountSid,
        authToken:  settings.twilioAuthToken,
        from:       settings.twilioWhatsappFrom,
      });

      const now   = nowTimestamp();
      const logId = await nextLogId();
      const log: ReminderLog = {
        id: logId,
        memberId:   member.id,
        memberName: member.name,
        phone:      member.phone,
        type:       type || 'Custom',
        message:    msg,
        sentAt:     now,
        status:     twilioResult.status === 'sent' ? 'Sent' : 'Simulated',
      };
      await insertReminderLog(log);

      return res.status(200).json({
        success:      true,
        log,
        whatsappUrl:  twilioResult.whatsappUrl,
        twilioSid:    twilioResult.sid,
        twilioStatus: twilioResult.status,
      });
    } catch (err: any) {
      console.error('[whatsapp/send]', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // ── POST /api/whatsapp/batch-send-unpaid ──────────────────────────────────
  if (route === 'batch-send-unpaid' && req.method === 'POST') {
    try {
      const { targetMemberIds, customTemplate } = await readBody(req as any);

      const [allMembers, settings] = await Promise.all([getMembers(), getSettings()]);
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

      const now         = nowTimestamp();
      const dispatchList: any[] = [];

      for (const m of unpaid) {
        const msg = customTemplate
          ? customTemplate
              .replace(/{Name}/g,    m.name)
              .replace(/{Balance}/g, String(m.remainingBalance))
              .replace(/{Plan}/g,    m.planType)
              .replace(/{Expiry}/g,  m.expiryDate)
          : buildMessage(m.name, m.remainingBalance, m.expiryDate, m.planType, 'Fee Reminder');

        // Attempt real Twilio send
        const twilioResult = await sendWhatsAppViaTwilio(m.phone, msg, {
          accountSid: settings.twilioAccountSid,
          authToken:  settings.twilioAuthToken,
          from:       settings.twilioWhatsappFrom,
        });

        const logId = await nextLogId();
        const log: ReminderLog = {
          id: logId, memberId: m.id, memberName: m.name, phone: m.phone,
          type: 'Fee Reminder', message: msg, sentAt: now,
          status: twilioResult.status === 'sent' ? 'Sent' : 'Simulated',
        };
        await insertReminderLog(log);

        dispatchList.push({
          memberId:     m.id,
          memberName:   m.name,
          phone:        m.phone,
          remainingBalance: m.remainingBalance,
          message:      msg,
          whatsappUrl:  twilioResult.whatsappUrl,
          twilioSid:    twilioResult.sid,
          twilioStatus: twilioResult.status,
          logId,
        });
      }

      const sentCount = dispatchList.filter((d) => d.twilioStatus === 'sent').length;
      const usedTwilio = sentCount > 0;

      return res.status(200).json({
        success: true,
        count:   dispatchList.length,
        message: usedTwilio
          ? `Sent ${sentCount}/${dispatchList.length} messages via Twilio WhatsApp!`
          : `Generated WhatsApp links for ${dispatchList.length} unpaid clients (Twilio not configured).`,
        dispatchList,
      });
    } catch (err: any) {
      console.error('[whatsapp/batch-send-unpaid]', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
