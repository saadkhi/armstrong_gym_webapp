import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from '../../src/apilib/cors';
import { nowTimestamp, calcMemberStatus } from '../../src/apilib/helpers';
import { ensureDb, getMembers, updateMemberRecord, insertReminderLog, nextLogId } from '../../src/apilib/db';
import type { ReminderLog } from '../../src/types';

/**
 * Cron endpoint for automated fee and expiry reminders.
 *
 * Authentication: Bearer token in the Authorization header matching
 * the CRON_SECRET environment variable.
 *
 * Vercel Cron automatically supplies: Authorization: Bearer <CRON_SECRET>
 * Manual trigger from the admin UI uses the same header via apiFetch.
 *
 * The legacy ?secret= query-param pathway has been removed — secrets must
 * not appear in URLs (they are logged by proxies and appear in server access logs).
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req as any, res as any)) return;

  // Vercel Cron sends GET; also accept POST for manual triggers from admin UI
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ── Authentication ───────────────────────────────────────────────────────────
  const expectedSecret = process.env.CRON_SECRET?.trim();
  if (!expectedSecret) {
    console.error('[cron/fee-reminders] CRON_SECRET is not set — rejecting all requests');
    return res.status(500).json({ error: 'Server misconfiguration: CRON_SECRET is not set' });
  }

  const bearer = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '').trim();
  // x-cron-secret header is kept as an alternative for direct server-to-server calls
  const providedSecret = bearer || (req.headers['x-cron-secret'] as string | undefined) || '';

  if (providedSecret !== expectedSecret) {
    return res.status(403).json({ error: 'Forbidden: invalid cron secret' });
  }

  // ── Processing ───────────────────────────────────────────────────────────────
  try {
    await ensureDb();

    const members = await getMembers();
    const now = nowTimestamp();

    let feeRemindersSent = 0;
    let expiryRemindersSent = 0;
    let expiredNoticesSent = 0;

    for (const m of members) {
      const status = calcMemberStatus(m.expiryDate);

      // Update status in DB if it has drifted
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
