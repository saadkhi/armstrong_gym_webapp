import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from '../_lib/cors';
import { authenticateRequest } from '../_lib/auth';
import { readBody, todayStr } from '../_lib/helpers';
import { getMembers, getTodayCheckIn, insertAttendance, nextAttendanceId } from '../_lib/db';
import type { Attendance } from '../../src/types';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req as any, res as any)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const payload = authenticateRequest(req as any);
  if (!payload) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const { memberId, checkInMethod } = await readBody(req as any);

    const members = await getMembers();
    const member = members.find(
      (m) => m.id.toLowerCase() === (memberId || '').trim().toLowerCase()
    );

    if (!member) {
      return res.status(404).json({
        success: false,
        error: `Member ID "${memberId}" not found in system`,
      });
    }

    const today = todayStr();
    const existing = await getTodayCheckIn(member.id, today);
    if (existing) {
      return res.status(400).json({
        success: false,
        error: `${member.name} (${member.id}) has already checked in today at ${existing.time}!`,
        existingCheckIn: existing,
        member,
      });
    }

    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];
    const attId = await nextAttendanceId();

    const record: Attendance = {
      id: attId,
      memberId: member.id,
      memberName: member.name,
      date: today,
      time: timeStr,
      checkInMethod: checkInMethod || 'Manual',
    };

    await insertAttendance(record);

    return res.status(201).json({
      success: true,
      message: `Successfully checked in ${member.name}!`,
      record,
      member,
    });
  } catch (err: any) {
    console.error('[attendance/check-in]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
