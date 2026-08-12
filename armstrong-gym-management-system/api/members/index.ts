import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from '../_lib/cors';
import { authenticateRequest } from '../_lib/auth';
import { readBody, calcMemberStatus, calcExpiry, planDuration, nowTimestamp, todayStr } from '../_lib/helpers';
import {
  getMembers, insertMember, nextMemberId,
  insertPayment, nextPaymentId, updateMemberRecord,
} from '../_lib/db';
import type { Member, Payment } from '../../src/types';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req as any, res as any)) return;

  const payload = authenticateRequest(req as any);
  if (!payload) return res.status(401).json({ error: 'Unauthorized' });

  // GET /api/members
  if (req.method === 'GET') {
    try {
      const members = await getMembers();
      const updated = members.map((m) => ({ ...m, status: calcMemberStatus(m.expiryDate) }));
      // Persist updated statuses in background
      void Promise.allSettled(
        updated
          .filter((m, i) => m.status !== members[i].status)
          .map((m) => updateMemberRecord(m.id, { status: m.status }))
      );
      return res.status(200).json(updated);
    } catch (err: any) {
      console.error('[members GET]', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // POST /api/members
  if (req.method === 'POST') {
    try {
      const body = await readBody<Partial<Member> & { amountPaid?: number }>(req as any);
      const {
        name, email, phone, gender, dateOfBirth, address, photoUrl,
        planType = 'Monthly', planCost = 0, amountPaid = 0,
        startDate, trainerId, emergencyContact, notes,
      } = body;

      if (!name) return res.status(400).json({ error: 'name is required' });

      const id = await nextMemberId();
      const duration = planDuration(planType as string);
      const start = startDate || todayStr();
      const expiry = calcExpiry(start, duration);
      const cost = Number(planCost);
      const paid = Number(amountPaid);
      const balance = Math.max(0, cost - paid);

      const newMember: Member = {
        id,
        name,
        email: email || '',
        phone: phone || '',
        gender: (gender as any) || 'Male',
        dateOfBirth,
        address,
        photoUrl: photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
        planType: planType as any,
        planDurationMonths: duration,
        planCost: cost,
        amountPaid: paid,
        remainingBalance: balance,
        startDate: start,
        expiryDate: expiry,
        status: calcMemberStatus(expiry),
        trainerId,
        emergencyContact,
        notes,
        createdAt: todayStr(),
      };

      await insertMember(newMember);

      // Record initial payment if amount was paid
      if (paid > 0) {
        const payId = await nextPaymentId();
        const payment: Payment = {
          id: payId,
          memberId: id,
          memberName: name,
          amount: paid,
          paymentMethod: 'Cash',
          date: nowTimestamp(),
          transactionId: `TXN-${Date.now().toString().slice(-6)}`,
          verificationStatus: 'Verified',
          verifiedBy: 'Armstrong Admin',
          verifiedAt: nowTimestamp(),
          notes: `Initial registration payment for ${planType} plan`,
        };
        await insertPayment(payment);
      }

      return res.status(201).json(newMember);
    } catch (err: any) {
      console.error('[members POST]', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
