import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from '../src/apilib/cors';
import { authenticateRequest } from '../src/apilib/auth';
import { readBody, nowTimestamp } from '../src/apilib/helpers';
import {
  getPayments, nextPaymentId,
  getPaymentById,
  getMemberById,
  getMembers, insertReminderLog, nextLogId, ensureDb,
  getPaymentsPaged,
  // transactional helpers — single DB round-trip per operation
  insertPaymentWithBalanceUpdate,
  verifyPaymentWithBalanceUpdate,
  deletePaymentWithBalanceRecalc,
} from '../src/apilib/db';
import type { Payment, ReminderLog } from '../src/types';
import { checkRateLimit, pruneExpiredEntries, getClientIp } from '../src/apilib/rateLimit';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req as any, res as any)) return;
  await ensureDb();
  if (applyCors(req as any, res as any)) return;

  pruneExpiredEntries();

  // _route and _id injected by vercel.json rewrites
  const route = (req.query._route as string) || '';
  const id    = (req.query._id    as string) || '';

  // ── POST /api/payments/submit-bill  (public — no auth) ───────────────────────
  if (route === 'submit-bill' && req.method === 'POST') {
    const ip = getClientIp(req.headers as any);
    const rl = checkRateLimit(`submit-bill:${ip}`, 20, 10 * 60 * 1000);
    if (rl.limited) {
      res.setHeader('Retry-After', String(rl.retryAfterSecs));
      return res.status(429).json({ success: false, error: 'Too many submissions. Please try again shortly.' });
    }
    try {
      const { memberQuery, amount, paymentMethod, transactionId, billUrl, notes } = await readBody(req as any);
      const q = (memberQuery || '').trim().toLowerCase();
      if (!q) return res.status(400).json({ success: false, error: 'memberQuery is required' });

      const members = await getMembers();
      const member  = members.find(
        (m) =>
          m.id.toLowerCase() === q ||
          m.phone.replace(/\s/g, '').includes(q.replace(/\s/g, '')) ||
          m.name.toLowerCase().includes(q)
      );
      if (!member) return res.status(404).json({ success: false, error: 'Member ID, phone, or name not found in system' });

      const paymentAmount = Number(amount);
      if (isNaN(paymentAmount) || paymentAmount <= 0) {
        return res.status(400).json({ success: false, error: 'Please enter a valid amount' });
      }

      const payId = await nextPaymentId();
      const now   = nowTimestamp();
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

      // Public submissions are always Pending — no balance change needed
      await insertPaymentWithBalanceUpdate(newPayment, false);

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

  // ── POST /api/payments/verify/:id ─────────────────────────────────────────────
  if (route === 'verify' && id && req.method === 'POST') {
    try {
      // Pre-check: payment must exist so we can build the receipt message
      const paymentBefore = await getPaymentById(id);
      if (!paymentBefore) return res.status(404).json({ error: 'Payment record not found' });

      const memberBefore = await getMemberById(paymentBefore.memberId);
      if (!memberBefore) return res.status(404).json({ error: 'Member associated with payment not found' });

      const now = nowTimestamp();

      // Atomic verify + balance update
      const { payment: updatedPayment, member: updatedMember } =
        await verifyPaymentWithBalanceUpdate(id, 'Armstrong Admin', now);

      const receiptMsg = `Dear ${memberBefore.name}, your transaction payment of ₹${paymentBefore.amount} (Ref: ${paymentBefore.transactionId || paymentBefore.id}) has been VERIFIED & UPDATED on the Armstrong Gym Portal! Remaining Balance: ₹${updatedMember?.remainingBalance ?? 0}. Thank you!`;

      const logId = await nextLogId();
      const log: ReminderLog = {
        id: logId,
        memberId: memberBefore.id,
        memberName: memberBefore.name,
        phone: memberBefore.phone,
        type: 'Custom',
        message: receiptMsg,
        sentAt: now,
        status: 'Sent',
      };
      await insertReminderLog(log);

      const whatsappUrl = `https://wa.me/${memberBefore.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(receiptMsg)}`;

      return res.status(200).json({ success: true, payment: updatedPayment, member: updatedMember, receiptMsg, whatsappUrl });
    } catch (err: any) {
      console.error('[payments/verify/:id]', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // ── Collection routes (no id, no special route) ───────────────────────────────
  if (!id && !route) {
    if (req.method === 'GET') {
      try {
        const pageParam     = req.query.page     as string | undefined;
        const pageSizeParam = req.query.pageSize as string | undefined;
        if (pageParam) {
          const page     = Math.max(1, parseInt(pageParam, 10) || 1);
          const pageSize = Math.min(200, Math.max(1, parseInt(pageSizeParam || '50', 10)));
          return res.status(200).json(await getPaymentsPaged(page, pageSize));
        }
        return res.status(200).json(await getPayments());
      } catch (err: any) {
        console.error('[payments GET]', err);
        return res.status(500).json({ error: 'Internal server error' });
      }
    }

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

        const now    = nowTimestamp();
        const status = verificationStatus || 'Verified';
        const payId  = await nextPaymentId();

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
          verifiedBy:  status === 'Verified' ? 'Armstrong Admin' : undefined,
          verifiedAt:  status === 'Verified' ? now               : undefined,
          notes: notes || '',
        };

        // Single atomic transaction: insert payment + update balance if verified
        const { member: updatedMember } =
          await insertPaymentWithBalanceUpdate(newPayment, status === 'Verified');

        return res.status(201).json({ payment: newPayment, member: updatedMember ?? member });
      } catch (err: any) {
        console.error('[payments POST]', err);
        return res.status(500).json({ error: 'Internal server error' });
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ── /api/payments/:id  (DELETE only) ─────────────────────────────────────────
  if (id && !route) {
    if (req.method === 'DELETE') {
      try {
        // Atomic delete + balance recalculation in one transaction
        const { deleted } = await deletePaymentWithBalanceRecalc(id);
        if (!deleted) return res.status(404).json({ error: 'Payment record not found' });
        return res.status(200).json({ success: true, message: 'Payment deleted & member balance recalculated' });
      } catch (err: any) {
        console.error('[payments/:id DELETE]', err);
        return res.status(500).json({ error: 'Internal server error' });
      }
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
