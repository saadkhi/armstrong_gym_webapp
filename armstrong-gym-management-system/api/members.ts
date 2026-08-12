import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from './_lib/cors';
import { authenticateRequest } from './_lib/auth';
import { readBody, calcMemberStatus, calcExpiry, planDuration, nowTimestamp, todayStr } from './_lib/helpers';
import {
  getMembers, getMemberById, insertMember, updateMemberRecord, deleteMemberRecord,
  nextMemberId, insertPayment, nextPaymentId,
} from './_lib/db';
import type { Member, Payment } from '../src/types';

/**
 * Consolidated members handler.
 * Routes:
 *   GET    /api/members            → list all
 *   POST   /api/members            → create
 *   GET    /api/members/:id        → get one
 *   PUT    /api/members/:id        → update
 *   DELETE /api/members/:id        → delete
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req as any, res as any)) return;

  const payload = authenticateRequest(req as any);
  if (!payload) return res.status(401).json({ error: 'Unauthorized' });

  // Extract id from URL path: /api/members/GM-001 → "GM-001"
  const url = (req.url || '').split('?')[0];
  const parts = url.replace(/^\/api\/members\/?/, '').split('/').filter(Boolean);
  const id = parts[0] || (req.query.id as string) || '';

  // ── Collection routes (no id) ────────────────────────────────────────────────
  if (!id) {
    // GET /api/members
    if (req.method === 'GET') {
      try {
        const members = await getMembers();
        const updated = members.map((m) => ({ ...m, status: calcMemberStatus(m.expiryDate) }));
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

        const newId = await nextMemberId();
        const duration = planDuration(planType as string);
        const start = startDate || todayStr();
        const expiry = calcExpiry(start, duration);
        const cost = Number(planCost);
        const paid = Number(amountPaid);
        const balance = Math.max(0, cost - paid);

        const newMember: Member = {
          id: newId,
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

        if (paid > 0) {
          const payId = await nextPaymentId();
          const payment: Payment = {
            id: payId,
            memberId: newId,
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

  // ── Single-resource routes (with id) ─────────────────────────────────────────

  // GET /api/members/:id
  if (req.method === 'GET') {
    try {
      const member = await getMemberById(id);
      if (!member) return res.status(404).json({ error: 'Member not found' });
      return res.status(200).json({ ...member, status: calcMemberStatus(member.expiryDate) });
    } catch (err: any) {
      console.error('[members/:id GET]', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // PUT /api/members/:id
  if (req.method === 'PUT') {
    try {
      const current = await getMemberById(id);
      if (!current) return res.status(404).json({ error: 'Member not found' });

      const body = await readBody(req as any);
      const merged = { ...current, ...body };

      if (body.planType || body.startDate) {
        merged.planDurationMonths = planDuration(merged.planType);
        merged.expiryDate = calcExpiry(merged.startDate, merged.planDurationMonths);
      }
      merged.remainingBalance = Math.max(0, Number(merged.planCost) - Number(merged.amountPaid));
      merged.status = calcMemberStatus(merged.expiryDate);

      const updated = await updateMemberRecord(id, merged);
      return res.status(200).json(updated);
    } catch (err: any) {
      console.error('[members/:id PUT]', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // DELETE /api/members/:id
  if (req.method === 'DELETE') {
    try {
      const member = await getMemberById(id);
      if (!member) return res.status(404).json({ error: 'Member not found' });
      await deleteMemberRecord(id);
      return res.status(200).json({ success: true, message: 'Member deleted successfully' });
    } catch (err: any) {
      console.error('[members/:id DELETE]', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
