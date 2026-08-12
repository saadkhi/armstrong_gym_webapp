import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from './_lib/cors';
import { authenticateRequest } from './_lib/auth';
import { readBody, nowTimestamp } from './_lib/helpers';
import {
  getPayments, insertPayment, nextPaymentId,
  getPaymentById, deletePaymentRecord, updatePaymentRecord,
  getMemberById, updateMemberRecord,
  getMembers, insertReminderLog, nextLogId,
} from './_lib/db';
import type { Payment, ReminderLog } from '../src/types';

/**
 * Consolidated payments handler.
 * Routes:
 *   GET    /api/payments                  → list all
 *   POST   /api/payments                  → create payment
 *   DELETE /api/payments/:id              → delete payment
 *   POST   /api/payments/submit-bill      → public bill upload (no auth)
 *   POST   /api/payments/verify/:id       → verify a pending payment
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req as any, res as any)) return;

  const url = (req.url || '').split('?')[0];
  // strip /api/payments prefix → remaining path
  const rest = url.replace(/^\/api\/payments\/?/, '');
  // rest examples: "" | "submit-bill" | "verify/PAY-1001" | "PAY-1001"
  const parts = rest.split('/').filter(Boolean);
  const segment = parts[0] || ''; // "submit-bill" | "verify" | "PAY-1001" | ""
  const subId = parts[1] || '';   // id after "verify/"

  // ── POST /api/payments/submit-bill  (public — no auth) ───────────────────────
  if (segment === 'submit-bill' && req.method === 'POST') {
    try {
      const { memberQuery, amount, paymentMethod, transactionId, billUrl, notes }
        = await readBody(req as any);

      const query = (memberQuery || '').trim().toLowerCase();
      if (!query) return res.status(400).json({ success: false, error: 'memberQuery is required' });

      const members = await getMembers();
      const member = members.find(
        (m) =>
          m.id.toLowerCase() === query ||
          m.phone.replace(/\s/g, '').includes(query.replace(/\s/g, '')) ||
          m.name.toLowerCase().includes(query)
      );
      if (!member) {
        return res.status(404).json({ success: false, error: 'Member ID, phone, or name not found in system' });
      }

      const paymentAmount = Number(amount);
      if (isNaN(paymentAmount) || paymentAmount <= 0) {
        return res.status(400).json({ success: false, error: 'Please enter a valid amount' });
      }

      const payId = await nextPaymentId();
      const now = nowTimestamp();
      const newPayment: Payment = {
        id: payId,
        memberId: member.id,
        memberName: member.name,
        amount: paymentAmount,
        paymentMethod: paymentMethod || 'UPI',
        date: now,
        transactionId: transactionId || `UTR-${Date.now().toString().slice(-8)}`,
        billUrl: billUrl || '',
        verificationStatus: 'Pending Verification',
        notes: notes || 'Submitted via Member Bill Upload Portal',
      };
      await insertPayment(newPayment);

      return res.status(201).json({
        success: true,
        message: `Transaction bill of ₹${paymentAmount} submitted! Gym admin will verify and update your portal record.`,
        payment: newPayment,
      });
    } catch (err: any) {
      console.error('[payments/submit-bill]', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // All remaining routes require authentication
  const payload = authenticateRequest(req as any);
  if (!payload) return res.status(401).json({ error: 'Unauthorized' });

  // ── POST /api/payments/verify/:id ────────────────────────────────────────────
  if (segment === 'verify' && subId && req.method === 'POST') {
    try {
      const payment = await getPaymentById(subId);
      if (!payment) return res.status(404).json({ error: 'Payment record not found' });

      const member = await getMemberById(payment.memberId);
      if (!member) return res.status(404).json({ error: 'Member associated with payment not found' });

      const now = nowTimestamp();

      if (payment.verificationStatus !== 'Verified') {
        const newPaid = Number(member.amountPaid) + Number(payment.amount);
        const newBalance = Math.max(0, Number(member.planCost) - newPaid);
        await updateMemberRecord(member.id, { amountPaid: newPaid, remainingBalance: newBalance });
      }

      await updatePaymentRecord(subId, {
        verificationStatus: 'Verified',
        verifiedBy: 'Armstrong Admin',
        verifiedAt: now,
      });

      const updatedPayment = await getPaymentById(subId);
      const updatedMember = await getMemberById(payment.memberId);

      const receiptMsg = `Dear ${member.name}, your transaction payment of ₹${payment.amount} (Ref: ${payment.transactionId || payment.id}) has been VERIFIED & UPDATED on the Armstrong Gym Portal! Remaining Balance: ₹${updatedMember?.remainingBalance ?? 0}. Thank you!`;

      const logId = await nextLogId();
      const log: ReminderLog = {
        id: logId,
        memberId: member.id,
        memberName: member.name,
        phone: member.phone,
        type: 'Custom',
        message: receiptMsg,
        sentAt: now,
        status: 'Sent',
      };
      await insertReminderLog(log);

      const whatsappUrl = `https://wa.me/${member.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(receiptMsg)}`;

      return res.status(200).json({
        success: true,
        payment: updatedPayment,
        member: updatedMember,
        receiptMsg,
        whatsappUrl,
      });
    } catch (err: any) {
      console.error('[payments/verify/:id]', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // ── Collection routes (no id segment) ────────────────────────────────────────
  if (!segment) {
    // GET /api/payments
    if (req.method === 'GET') {
      try {
        return res.status(200).json(await getPayments());
      } catch (err: any) {
        console.error('[payments GET]', err);
        return res.status(500).json({ error: 'Internal server error' });
      }
    }

    // POST /api/payments
    if (req.method === 'POST') {
      try {
        const { memberId, amount, paymentMethod, notes, transactionId, billUrl, verificationStatus }
          = await readBody(req as any);

        const member = await getMemberById(memberId);
        if (!member) return res.status(404).json({ error: 'Member not found' });

        const paymentAmount = Number(amount);
        if (isNaN(paymentAmount) || paymentAmount <= 0) {
          return res.status(400).json({ error: 'Invalid payment amount' });
        }

        const now = nowTimestamp();
        const status = verificationStatus || 'Verified';
        const payId = await nextPaymentId();

        const newPayment: Payment = {
          id: payId,
          memberId: member.id,
          memberName: member.name,
          amount: paymentAmount,
          paymentMethod: paymentMethod || 'Cash',
          date: now,
          transactionId: transactionId || `TXN-${Date.now().toString().slice(-6)}`,
          billUrl: billUrl || '',
          verificationStatus: status,
          verifiedBy: status === 'Verified' ? 'Armstrong Admin' : undefined,
          verifiedAt: status === 'Verified' ? now : undefined,
          notes: notes || '',
        };

        await insertPayment(newPayment);

        let updatedMember = member;
        if (status === 'Verified') {
          const newPaid = Number(member.amountPaid) + paymentAmount;
          const newBalance = Math.max(0, Number(member.planCost) - newPaid);
          updatedMember = (await updateMemberRecord(member.id, {
            amountPaid: newPaid,
            remainingBalance: newBalance,
          })) ?? member;
        }

        return res.status(201).json({ payment: newPayment, member: updatedMember });
      } catch (err: any) {
        console.error('[payments POST]', err);
        return res.status(500).json({ error: 'Internal server error' });
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ── Single-resource routes: /api/payments/:id ─────────────────────────────────
  const id = segment;

  // DELETE /api/payments/:id
  if (req.method === 'DELETE') {
    try {
      const payment = await deletePaymentRecord(id);
      if (!payment) return res.status(404).json({ error: 'Payment record not found' });

      const member = await getMemberById(payment.memberId);
      if (member && payment.verificationStatus === 'Verified') {
        const newPaid = Math.max(0, Number(member.amountPaid) - Number(payment.amount));
        const newBalance = Math.max(0, Number(member.planCost) - newPaid);
        await updateMemberRecord(member.id, { amountPaid: newPaid, remainingBalance: newBalance });
      }

      return res.status(200).json({ success: true, message: 'Payment deleted & member balance recalculated' });
    } catch (err: any) {
      console.error('[payments/:id DELETE]', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
