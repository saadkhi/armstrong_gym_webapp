import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from '../lib/cors';
import { nowTimestamp, calcMemberStatus } from '../lib/helpers';
import { ensureDb, getMembers, updateMemberRecord, getSettings, insertReminderLog, nextLogId } from '../lib/db';
import type { ReminderLog } from '../../src/types';

// Cron is secured by a shared secret, not JWT
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req as any, res as any)) return;
  // Vercel Cron sends GET; also accept POST for manual triggers
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    await ensureDb();

    const settings = await getSettings();
    const bearer = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '').trim();
    const providedSecret =
      bearer ||
      (req.headers['x-cron-secret'] as string) ||
      (req.query.secret as string) ||
      '';

    const expectedSecret = process.env.CRON_SECRET || settings.cronSecret;
    if (expectedSecret && providedSecret !== expectedSecret) {
      return res.status(403).json({ error: 'Invalid cron secret' });
    }

    const members = await getMembers();
    const now = nowTimestamp();

    let feeRemindersSent = 0;
    let expiryRemindersSent = 0;
    let expiredNoticesSent = 0;

    for (const m of members) {
      const status = calcMemberStatus(m.expiryDate);

      // Update status in DB if changed
      if (status !== m.status) {
        await updateMemberRecord(m.id, { status });
      }

      if (Number(m.remainingBalance) > 0) {
        feeRemindersSent++;
        const logId = await nextLogId();
        const log: ReminderLog = {
          id: logId,
          memberId: m.id,
          memberName: m.name,
          phone: m.phone,
          type: 'Fee Reminder',
          message: `[AUTO CRON] Dear ${m.name}, outstanding dues of ₹${m.remainingBalance} detected. Kindly pay at gym reception.`,
          sentAt: now,
          status: 'Sent',
        };
        await insertReminderLog(log);
      }

      if (status === 'Expiring') {
        expiryRemindersSent++;
        const logId = await nextLogId();
        const log: ReminderLog = {
          id: logId,
          memberId: m.id,
          memberName: m.name,
          phone: m.phone,
          type: 'Expiry Reminder',
          message: `[AUTO CRON] Dear ${m.name}, your membership expires on ${m.expiryDate}. Please renew to keep your access active.`,
          sentAt: now,
          status: 'Sent',
        };
        await insertReminderLog(log);
      }

      if (status === 'Expired') {
        expiredNoticesSent++;
        const logId = await nextLogId();
        const log: ReminderLog = {
          id: logId,
          memberId: m.id,
          memberName: m.name,
          phone: m.phone,
          type: 'Expired Notice',
          message: `[AUTO CRON] Dear ${m.name}, your membership expired on ${m.expiryDate}. Renew today to continue training!`,
          sentAt: now,
          status: 'Sent',
        };
        await insertReminderLog(log);
      }
    }

    return res.status(200).json({
      success: true,
      timestamp: now,
      summary: {
        totalMembersProcessed: members.length,
        feeRemindersSent,
        expiryRemindersSent,
        expiredNoticesSent,
      },
    });
  } catch (err: any) {
    console.error('[cron/fee-reminders]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
