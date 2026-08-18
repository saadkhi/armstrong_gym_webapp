import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from '../src/apilib/cors';
import { authenticateRequest } from '../src/apilib/auth';
import { readBody, calcMemberStatus, calcExpiry, planDuration, nowTimestamp, todayStr } from '../src/apilib/helpers';
import {
  getMembers, getMemberById, insertMember, updateMemberRecord, deleteMemberRecord,
  nextMemberId, insertPayment, nextPaymentId, getMembersPaged, ensureDb,
  getMemberByPhone, renewMembership,
} from '../src/apilib/db';
import type { Member, Payment } from '../src/types';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req as any, res as any)) return;
  await ensureDb();
  if (applyCors(req as any, res as any)) return;

  const payload = authenticateRequest(req as any);
  if (!payload) return res.status(401).json({ error: 'Unauthorized' });

  // _id and _route injected by vercel.json rewrites
  const id    = (req.query._id    as string) || '';
  const route = (req.query._route as string) || '';

  // ── POST /api/members/:id/renew ────────────────────────────────────────────
  if (id && route === 'renew' && req.method === 'POST') {
    try {
      const { planType = 'Monthly', planCost, amountPaid = 0, paymentMethod = 'Cash', transactionId, notes }
        = await readBody(req as any);
      const payId = await nextPaymentId();
      const { member, payment } = await renewMembership(id, {
        planType, planCost: Number(planCost), amountPaid: Number(amountPaid),
        paymentMethod, paymentId: payId, transactionId, notes, nowTs: nowTimestamp(),
      });
      return res.status(200).json({ success: true, member, payment });
    } catch (err: any) {
      console.error('[members/:id/renew]', err);
      return res.status(err.message === 'Member not found' ? 404 : 500).json({ error: err.message || 'Internal server error' });
    }
  }

  // ── Collection routes (no id) ─────────────────────────────────────────────────
  if (!id) {
    if (req.method === 'GET') {
      try {
        const pageParam = req.query.page as string | undefined;
        const pageSizeParam = req.query.pageSize as string | undefined;

        if (pageParam) {
          // Paginated path
          const page     = Math.max(1, parseInt(pageParam, 10) || 1);
          const pageSize = Math.min(200, Math.max(1, parseInt(pageSizeParam || '50', 10)));
          const result   = await getMembersPaged(page, pageSize);
          result.data    = result.data.map((m) => ({ ...m, status: calcMemberStatus(m.expiryDate) }));
          // Lazily sync changed statuses
          const original = await getMembers(); // only for diff — still one query
          void Promise.allSettled(
            result.data
              .filter((m) => {
                const orig = original.find((o) => o.id === m.id);
                return orig && orig.status !== m.status;
              })
              .map((m) => updateMemberRecord(m.id, { status: m.status }))
          );
          return res.status(200).json(result);
        }

        // Unpaged (legacy) — returns plain array for backward-compat
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

    if (req.method === 'POST') {
      try {
        const body = await readBody<Partial<Member> & { amountPaid?: number }>(req as any);
        const {
          name, email, phone, gender, dateOfBirth, address, photoUrl,
          planType = 'Monthly', planCost = 0, amountPaid = 0,
          startDate, trainerId, emergencyContact, notes,
        } = body;

        if (!name) return res.status(400).json({ error: 'name is required' });

        // ── Duplicate phone check ──────────────────────────────────────────────
        if (phone) {
          const existing = await getMemberByPhone(phone);
          if (existing) {
            return res.status(409).json({
              error: `Phone number is already registered to member ${existing.name} (${existing.id})`,
            });
          }
        }

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

  // ── Single-resource routes (/api/members/:id) ─────────────────────────────────
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
