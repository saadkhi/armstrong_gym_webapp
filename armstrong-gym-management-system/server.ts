import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cors from 'cors';

import {
  createTables,
  seedDbIfNeeded,
  // admin
  getAdminByEmail,
  getAdminById,
  // members
  getMembers,
  getMemberById,
  insertMember,
  updateMemberRecord,
  deleteMemberRecord,
  nextMemberId,
  // payments
  getPayments,
  getPaymentById,
  insertPayment,
  updatePaymentRecord,
  deletePaymentRecord,
  nextPaymentId,
  // attendance
  getAttendance,
  getTodayCheckIn,
  insertAttendance,
  nextAttendanceId,
  // trainers
  getTrainers,
  insertTrainer,
  updateTrainerRecord,
  deleteTrainerRecord,
  nextTrainerId,
  // expenses
  getExpenses,
  insertExpense,
  deleteExpenseRecord,
  nextExpenseId,
  // reminder logs
  getReminderLogs,
  insertReminderLog,
  nextLogId,
  // settings
  getSettings,
  updateSettings,
} from './src/db';

import type { Member, Payment, Attendance, Trainer, Expense, ReminderLog } from './src/types';

const PORT = Number(process.env.PORT) || 3001;

// ─── JWT helpers ──────────────────────────────────────────────────────────────
function getJwtSecret(): string {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error('JWT_SECRET is not set');
  return s;
}

function signToken(payload: { sub: string; email: string; role: string }): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '8h' });
}

function verifyToken(token: string): any {
  return jwt.verify(token, getJwtSecret());
}

// ─── Middleware ───────────────────────────────────────────────────────────────
function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization ?? '';
  if (!header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const decoded = verifyToken(header.slice(7).trim());
    (req as any).admin = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function calcMemberStatus(expiryDate: string): 'Active' | 'Expiring' | 'Expired' {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 3600 * 24));
  if (diffDays < 0) return 'Expired';
  if (diffDays <= 7) return 'Expiring';
  return 'Active';
}

function nowTimestamp(): string {
  const d = new Date();
  return `${d.toISOString().split('T')[0]} ${d.toTimeString().split(' ')[0]}`;
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

function planDuration(planType: string): number {
  if (planType === 'Quarterly') return 3;
  if (planType === 'Half-Yearly') return 6;
  if (planType === 'Yearly') return 12;
  return 1;
}

function calcExpiry(startDate: string, months: number): string {
  const d = new Date(startDate);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split('T')[0];
}

async function startServer() {
  const app = express();

  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: '10mb' }));

  // Init DB
  await createTables();
  await seedDbIfNeeded();
  console.log('✓ Database ready');

  // ─── Auth ──────────────────────────────────────────────────────────────────
  app.post('/api/auth/login', async (req: Request, res: Response) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }
    try {
      const admin = await getAdminByEmail(email.trim().toLowerCase());
      if (!admin) return res.status(401).json({ success: false, error: 'Invalid email or password' });

      const valid = await bcrypt.compare(password, admin.passwordHash);
      if (!valid) return res.status(401).json({ success: false, error: 'Invalid email or password' });

      const token = signToken({ sub: admin.id, email: admin.email, role: admin.role });
      return res.json({
        success: true,
        token,
        user: { id: admin.id, name: admin.name, email: admin.email, role: admin.role },
      });
    } catch (err) {
      console.error('[auth/login]', err);
      return res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  app.get('/api/auth/me', requireAuth, async (req: Request, res: Response) => {
    const payload = (req as any).admin;
    try {
      const admin = await getAdminById(payload.sub);
      if (!admin) return res.status(404).json({ success: false, error: 'Admin not found' });
      return res.json({ success: true, user: admin });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // ─── Stats ─────────────────────────────────────────────────────────────────
  app.get('/api/stats', requireAuth, async (_req: Request, res: Response) => {
    try {
      const [members, payments, expenses] = await Promise.all([getMembers(), getPayments(), getExpenses()]);
      const withStatus = members.map((m) => ({ ...m, status: calcMemberStatus(m.expiryDate) }));
      const today = todayStr();
      const month = today.substring(0, 7);

      return res.json({
        totalMembers: withStatus.length,
        activeMembers: withStatus.filter((m) => m.status === 'Active').length,
        expiringMembers: withStatus.filter((m) => m.status === 'Expiring').length,
        expiredMembers: withStatus.filter((m) => m.status === 'Expired').length,
        todaysIncome: payments.filter((p) => p.date.startsWith(today)).reduce((s, p) => s + Number(p.amount), 0),
        monthlyIncome: payments.filter((p) => p.date.startsWith(month)).reduce((s, p) => s + Number(p.amount), 0),
        monthlyExpenses: expenses.filter((e) => e.date.startsWith(month)).reduce((s, e) => s + Number(e.amount), 0),
        outstandingDues: withStatus.reduce((s, m) => s + Number(m.remainingBalance), 0),
        netProfit:
          payments.filter((p) => p.date.startsWith(month)).reduce((s, p) => s + Number(p.amount), 0) -
          expenses.filter((e) => e.date.startsWith(month)).reduce((s, e) => s + Number(e.amount), 0),
      });
    } catch (err) {
      console.error('[stats]', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ─── Members ───────────────────────────────────────────────────────────────
  app.get('/api/members', requireAuth, async (_req, res) => {
    try {
      const members = await getMembers();
      const updated = members.map((m) => ({ ...m, status: calcMemberStatus(m.expiryDate) }));
      void Promise.allSettled(
        updated.filter((m, i) => m.status !== members[i].status)
          .map((m) => updateMemberRecord(m.id, { status: m.status }))
      );
      return res.json(updated);
    } catch (err) { console.error('[members GET]', err); return res.status(500).json({ error: 'Internal server error' }); }
  });

  app.get('/api/members/:id', requireAuth, async (req, res) => {
    try {
      const m = await getMemberById(req.params.id);
      if (!m) return res.status(404).json({ error: 'Member not found' });
      return res.json({ ...m, status: calcMemberStatus(m.expiryDate) });
    } catch (err) { return res.status(500).json({ error: 'Internal server error' }); }
  });

  app.post('/api/members', requireAuth, async (req, res) => {
    try {
      const { name, email, phone, gender, dateOfBirth, address, photoUrl,
        planType = 'Monthly', planCost = 0, amountPaid = 0,
        startDate, trainerId, emergencyContact, notes } = req.body;
      if (!name) return res.status(400).json({ error: 'name is required' });

      const id = await nextMemberId();
      const duration = planDuration(planType);
      const start = startDate || todayStr();
      const expiry = calcExpiry(start, duration);
      const cost = Number(planCost); const paid = Number(amountPaid);

      const newMember: Member = {
        id, name, email: email || '', phone: phone || '', gender: gender || 'Male',
        dateOfBirth, address,
        photoUrl: photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
        planType, planDurationMonths: duration, planCost: cost,
        amountPaid: paid, remainingBalance: Math.max(0, cost - paid),
        startDate: start, expiryDate: expiry, status: calcMemberStatus(expiry),
        trainerId, emergencyContact, notes, createdAt: todayStr(),
      };
      await insertMember(newMember);

      if (paid > 0) {
        const payId = await nextPaymentId();
        await insertPayment({
          id: payId, memberId: id, memberName: name, amount: paid,
          paymentMethod: 'Cash', date: nowTimestamp(),
          transactionId: `TXN-${Date.now().toString().slice(-6)}`,
          verificationStatus: 'Verified', verifiedBy: 'Armstrong Admin', verifiedAt: nowTimestamp(),
          notes: `Initial registration payment for ${planType} plan`,
        });
      }
      return res.status(201).json(newMember);
    } catch (err) { console.error('[members POST]', err); return res.status(500).json({ error: 'Internal server error' }); }
  });

  app.put('/api/members/:id', requireAuth, async (req, res) => {
    try {
      const current = await getMemberById(req.params.id);
      if (!current) return res.status(404).json({ error: 'Member not found' });
      const merged: any = { ...current, ...req.body };
      if (req.body.planType || req.body.startDate) {
        merged.planDurationMonths = planDuration(merged.planType);
        merged.expiryDate = calcExpiry(merged.startDate, merged.planDurationMonths);
      }
      merged.remainingBalance = Math.max(0, Number(merged.planCost) - Number(merged.amountPaid));
      merged.status = calcMemberStatus(merged.expiryDate);
      const updated = await updateMemberRecord(req.params.id, merged);
      return res.json(updated);
    } catch (err) { console.error('[members PUT]', err); return res.status(500).json({ error: 'Internal server error' }); }
  });

  app.delete('/api/members/:id', requireAuth, async (req, res) => {
    try {
      const m = await getMemberById(req.params.id);
      if (!m) return res.status(404).json({ error: 'Member not found' });
      await deleteMemberRecord(req.params.id);
      return res.json({ success: true, message: 'Member deleted successfully' });
    } catch (err) { return res.status(500).json({ error: 'Internal server error' }); }
  });

  // ─── Payments ──────────────────────────────────────────────────────────────
  app.get('/api/payments', requireAuth, async (_req, res) => {
    try { return res.json(await getPayments()); }
    catch (err) { return res.status(500).json({ error: 'Internal server error' }); }
  });

  app.post('/api/payments', requireAuth, async (req, res) => {
    try {
      const { memberId, amount, paymentMethod, notes, transactionId, billUrl, verificationStatus } = req.body;
      const member = await getMemberById(memberId);
      if (!member) return res.status(404).json({ error: 'Member not found' });
      const payAmt = Number(amount);
      if (isNaN(payAmt) || payAmt <= 0) return res.status(400).json({ error: 'Invalid payment amount' });

      const now = nowTimestamp();
      const status = verificationStatus || 'Verified';
      const payId = await nextPaymentId();
      const newPayment: Payment = {
        id: payId, memberId: member.id, memberName: member.name, amount: payAmt,
        paymentMethod: paymentMethod || 'Cash', date: now,
        transactionId: transactionId || `TXN-${Date.now().toString().slice(-6)}`,
        billUrl: billUrl || '', verificationStatus: status,
        verifiedBy: status === 'Verified' ? 'Armstrong Admin' : undefined,
        verifiedAt: status === 'Verified' ? now : undefined,
        notes: notes || '',
      };
      await insertPayment(newPayment);
      let updatedMember = member;
      if (status === 'Verified') {
        const newPaid = Number(member.amountPaid) + payAmt;
        const newBal = Math.max(0, Number(member.planCost) - newPaid);
        updatedMember = (await updateMemberRecord(member.id, { amountPaid: newPaid, remainingBalance: newBal })) ?? member;
      }
      return res.status(201).json({ payment: newPayment, member: updatedMember });
    } catch (err) { console.error('[payments POST]', err); return res.status(500).json({ error: 'Internal server error' }); }
  });

  // Public: member self-service bill upload (no requireAuth)
  app.post('/api/payments/submit-bill', async (req, res) => {
    try {
      const { memberQuery, amount, paymentMethod, transactionId, billUrl, notes } = req.body;
      const q = (memberQuery || '').trim().toLowerCase();
      if (!q) return res.status(400).json({ success: false, error: 'memberQuery is required' });
      const members = await getMembers();
      const member = members.find(
        (m) => m.id.toLowerCase() === q || m.phone.replace(/\s/g, '').includes(q.replace(/\s/g, '')) || m.name.toLowerCase().includes(q)
      );
      if (!member) return res.status(404).json({ success: false, error: 'Member not found in system' });
      const payAmt = Number(amount);
      if (isNaN(payAmt) || payAmt <= 0) return res.status(400).json({ success: false, error: 'Invalid amount' });
      const payId = await nextPaymentId();
      const newPayment: Payment = {
        id: payId, memberId: member.id, memberName: member.name, amount: payAmt,
        paymentMethod: paymentMethod || 'UPI', date: nowTimestamp(),
        transactionId: transactionId || `UTR-${Date.now().toString().slice(-8)}`,
        billUrl: billUrl || '', verificationStatus: 'Pending Verification',
        notes: notes || 'Submitted via Member Bill Upload Portal',
      };
      await insertPayment(newPayment);
      return res.status(201).json({
        success: true,
        message: `Bill of ₹${payAmt} submitted. Gym admin will verify and update your record.`,
        payment: newPayment,
      });
    } catch (err) { return res.status(500).json({ error: 'Internal server error' }); }
  });

  app.post('/api/payments/verify/:id', requireAuth, async (req, res) => {
    try {
      const payment = await getPaymentById(req.params.id);
      if (!payment) return res.status(404).json({ error: 'Payment not found' });
      const member = await getMemberById(payment.memberId);
      if (!member) return res.status(404).json({ error: 'Member not found' });
      const now = nowTimestamp();
      if (payment.verificationStatus !== 'Verified') {
        const newPaid = Number(member.amountPaid) + Number(payment.amount);
        await updateMemberRecord(member.id, { amountPaid: newPaid, remainingBalance: Math.max(0, Number(member.planCost) - newPaid) });
      }
      await updatePaymentRecord(req.params.id, { verificationStatus: 'Verified', verifiedBy: 'Armstrong Admin', verifiedAt: now });
      const updatedPayment = await getPaymentById(req.params.id);
      const updatedMember = await getMemberById(payment.memberId);
      const receiptMsg = `Dear ${member.name}, your payment of ₹${payment.amount} (Ref: ${payment.transactionId || payment.id}) has been VERIFIED on the Armstrong Gym Portal! Remaining Balance: ₹${updatedMember?.remainingBalance ?? 0}. Thank you!`;
      const logId = await nextLogId();
      await insertReminderLog({ id: logId, memberId: member.id, memberName: member.name, phone: member.phone, type: 'Custom', message: receiptMsg, sentAt: now, status: 'Sent' });
      return res.json({
        success: true, payment: updatedPayment, member: updatedMember, receiptMsg,
        whatsappUrl: `https://wa.me/${member.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(receiptMsg)}`,
      });
    } catch (err) { return res.status(500).json({ error: 'Internal server error' }); }
  });

  app.delete('/api/payments/:id', requireAuth, async (req, res) => {
    try {
      const payment = await deletePaymentRecord(req.params.id);
      if (!payment) return res.status(404).json({ error: 'Payment not found' });
      if (payment.verificationStatus === 'Verified') {
        const member = await getMemberById(payment.memberId);
        if (member) {
          const newPaid = Math.max(0, Number(member.amountPaid) - Number(payment.amount));
          await updateMemberRecord(member.id, { amountPaid: newPaid, remainingBalance: Math.max(0, Number(member.planCost) - newPaid) });
        }
      }
      return res.json({ success: true, message: 'Payment deleted & balance recalculated' });
    } catch (err) { return res.status(500).json({ error: 'Internal server error' }); }
  });

  // ─── Attendance ────────────────────────────────────────────────────────────
  app.get('/api/attendance', requireAuth, async (_req, res) => {
    try { return res.json(await getAttendance()); }
    catch (err) { return res.status(500).json({ error: 'Internal server error' }); }
  });

  app.post('/api/attendance/check-in', requireAuth, async (req, res) => {
    try {
      const { memberId, checkInMethod } = req.body;
      const members = await getMembers();
      const member = members.find((m) => m.id.toLowerCase() === (memberId || '').trim().toLowerCase());
      if (!member) return res.status(404).json({ success: false, error: `Member "${memberId}" not found` });
      const today = todayStr();
      const existing = await getTodayCheckIn(member.id, today);
      if (existing) return res.status(400).json({ success: false, error: `${member.name} already checked in today at ${existing.time}!`, existingCheckIn: existing, member });
      const now = new Date();
      const attId = await nextAttendanceId();
      const record: Attendance = { id: attId, memberId: member.id, memberName: member.name, date: today, time: now.toTimeString().split(' ')[0], checkInMethod: checkInMethod || 'Manual' };
      await insertAttendance(record);
      return res.status(201).json({ success: true, message: `Successfully checked in ${member.name}!`, record, member });
    } catch (err) { return res.status(500).json({ error: 'Internal server error' }); }
  });

  // ─── Trainers ──────────────────────────────────────────────────────────────
  app.get('/api/trainers', requireAuth, async (_req, res) => {
    try {
      const [trainers, members] = await Promise.all([getTrainers(), getMembers()]);
      return res.json(trainers.map((t) => ({ ...t, assignedMembersCount: members.filter((m) => m.trainerId === t.id).length })));
    } catch (err) { return res.status(500).json({ error: 'Internal server error' }); }
  });

  app.post('/api/trainers', requireAuth, async (req, res) => {
    try {
      const { name, phone, email, specialty, salary, shift, status, joiningDate } = req.body;
      if (!name) return res.status(400).json({ error: 'name is required' });
      const id = await nextTrainerId();
      const newTrainer: Trainer = { id, name, phone: phone || '', email: email || '', specialty: specialty || 'Fitness & Conditioning', salary: Number(salary) || 30000, shift: shift || 'Morning', status: status || 'Active', joiningDate: joiningDate || todayStr(), assignedMembersCount: 0 };
      await insertTrainer(newTrainer);
      return res.status(201).json(newTrainer);
    } catch (err) { return res.status(500).json({ error: 'Internal server error' }); }
  });

  app.put('/api/trainers/:id', requireAuth, async (req, res) => {
    try {
      const updated = await updateTrainerRecord(req.params.id, req.body);
      if (!updated) return res.status(404).json({ error: 'Trainer not found' });
      return res.json(updated);
    } catch (err) { return res.status(500).json({ error: 'Internal server error' }); }
  });

  app.delete('/api/trainers/:id', requireAuth, async (req, res) => {
    try { await deleteTrainerRecord(req.params.id); return res.json({ success: true }); }
    catch (err) { return res.status(500).json({ error: 'Internal server error' }); }
  });

  // ─── Expenses ──────────────────────────────────────────────────────────────
  app.get('/api/expenses', requireAuth, async (_req, res) => {
    try { return res.json(await getExpenses()); }
    catch (err) { return res.status(500).json({ error: 'Internal server error' }); }
  });

  app.post('/api/expenses', requireAuth, async (req, res) => {
    try {
      const { title, amount, category, date, notes } = req.body;
      if (!title) return res.status(400).json({ error: 'title is required' });
      const id = await nextExpenseId();
      const newExpense: Expense = { id, title, amount: Number(amount) || 0, category: category || 'Misc', date: date || todayStr(), notes: notes || '' };
      await insertExpense(newExpense);
      return res.status(201).json(newExpense);
    } catch (err) { return res.status(500).json({ error: 'Internal server error' }); }
  });

  app.delete('/api/expenses/:id', requireAuth, async (req, res) => {
    try { await deleteExpenseRecord(req.params.id); return res.json({ success: true }); }
    catch (err) { return res.status(500).json({ error: 'Internal server error' }); }
  });

  // ─── WhatsApp / Reminders ──────────────────────────────────────────────────
  app.get('/api/whatsapp/logs', requireAuth, async (_req, res) => {
    try { return res.json(await getReminderLogs()); }
    catch (err) { return res.status(500).json({ error: 'Internal server error' }); }
  });

  app.post('/api/whatsapp/send', requireAuth, async (req, res) => {
    try {
      const { memberId, type, customMessage } = req.body;
      const member = await getMemberById(memberId);
      if (!member) return res.status(404).json({ error: 'Member not found' });
      let msg: string = customMessage;
      if (!msg) {
        switch (type) {
          case 'Fee Reminder':   msg = `Dear ${member.name}, your remaining balance of ₹${member.remainingBalance} for Armstrong Gym is due. Kindly make payment at your earliest convenience. Thank you!`; break;
          case 'Expiry Reminder': msg = `Dear ${member.name}, your Armstrong Gym membership expires on ${member.expiryDate}. Renew now to continue uninterrupted workouts!`; break;
          case 'Expired Notice':  msg = `Dear ${member.name}, your Armstrong Gym membership expired on ${member.expiryDate}. Please renew your plan to reactivate access.`; break;
          default: msg = `Hello ${member.name}, greetings from Armstrong Gym! We hope you are having a great training session.`;
        }
      }
      const logId = await nextLogId();
      const log: ReminderLog = { id: logId, memberId: member.id, memberName: member.name, phone: member.phone, type: type || 'Custom', message: msg, sentAt: nowTimestamp(), status: 'Sent' };
      await insertReminderLog(log);
      return res.json({ success: true, log, whatsappUrl: `https://wa.me/${member.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(msg)}` });
    } catch (err) { return res.status(500).json({ error: 'Internal server error' }); }
  });

  app.post('/api/whatsapp/batch-send-unpaid', requireAuth, async (req, res) => {
    try {
      const { targetMemberIds, customTemplate } = req.body;
      const allMembers = await getMembers();
      let unpaid = allMembers.filter((m) => Number(m.remainingBalance) > 0);
      if (Array.isArray(targetMemberIds) && targetMemberIds.length > 0) {
        unpaid = unpaid.filter((m) => targetMemberIds.includes(m.id));
      }
      if (unpaid.length === 0) return res.json({ success: true, count: 0, message: 'No unpaid clients found.', dispatchList: [] });
      const now = nowTimestamp();
      const dispatchList: any[] = [];
      for (const m of unpaid) {
        const msg = customTemplate
          ? customTemplate.replace(/{Name}/g, m.name).replace(/{Balance}/g, String(m.remainingBalance)).replace(/{Plan}/g, m.planType).replace(/{Expiry}/g, m.expiryDate)
          : `Dear ${m.name}, your Armstrong Gym fee balance of ₹${m.remainingBalance} for your ${m.planType} plan is pending. Please make your payment via UPI or Cash and submit the receipt to gym admin. Thank you!`;
        const logId = await nextLogId();
        await insertReminderLog({ id: logId, memberId: m.id, memberName: m.name, phone: m.phone, type: 'Fee Reminder', message: msg, sentAt: now, status: 'Sent' });
        dispatchList.push({ memberId: m.id, memberName: m.name, phone: m.phone, remainingBalance: m.remainingBalance, message: msg, whatsappUrl: `https://wa.me/${m.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(msg)}`, logId });
      }
      return res.json({ success: true, count: dispatchList.length, message: `Messages generated for ${dispatchList.length} unpaid clients!`, dispatchList });
    } catch (err) { return res.status(500).json({ error: 'Internal server error' }); }
  });

  // ─── Cron ──────────────────────────────────────────────────────────────────
  app.post('/api/cron/fee-reminders', async (req, res) => {
    try {
      const settings = await getSettings();
      const bearer = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '').trim();
      const provided = bearer || (req.headers['x-cron-secret'] as string) || (req.query.secret as string) || '';
      const expectedSecret = process.env.CRON_SECRET || settings.cronSecret;
      if (expectedSecret && provided !== expectedSecret) return res.status(403).json({ error: 'Invalid cron secret' });
      const members = await getMembers();
      const now = nowTimestamp();
      let feeRemindersSent = 0, expiryRemindersSent = 0, expiredNoticesSent = 0;
      for (const m of members) {
        const status = calcMemberStatus(m.expiryDate);
        if (status !== m.status) await updateMemberRecord(m.id, { status });
        if (Number(m.remainingBalance) > 0) {
          feeRemindersSent++;
          await insertReminderLog({ id: await nextLogId(), memberId: m.id, memberName: m.name, phone: m.phone, type: 'Fee Reminder', message: `[AUTO CRON] Dear ${m.name}, outstanding dues of ₹${m.remainingBalance} detected. Kindly pay at gym reception.`, sentAt: now, status: 'Sent' });
        }
        if (status === 'Expiring') {
          expiryRemindersSent++;
          await insertReminderLog({ id: await nextLogId(), memberId: m.id, memberName: m.name, phone: m.phone, type: 'Expiry Reminder', message: `[AUTO CRON] Dear ${m.name}, your membership expires on ${m.expiryDate}. Please renew to keep your access active.`, sentAt: now, status: 'Sent' });
        }
        if (status === 'Expired') {
          expiredNoticesSent++;
          await insertReminderLog({ id: await nextLogId(), memberId: m.id, memberName: m.name, phone: m.phone, type: 'Expired Notice', message: `[AUTO CRON] Dear ${m.name}, your membership expired on ${m.expiryDate}. Renew today to continue training!`, sentAt: now, status: 'Sent' });
        }
      }
      return res.json({ success: true, timestamp: now, summary: { totalMembersProcessed: members.length, feeRemindersSent, expiryRemindersSent, expiredNoticesSent } });
    } catch (err) { return res.status(500).json({ error: 'Internal server error' }); }
  });

  // ─── Settings ──────────────────────────────────────────────────────────────
  app.get('/api/settings', requireAuth, async (_req, res) => {
    try {
      const s = await getSettings();
      return res.json({ ...s, twilioAuthToken: s.twilioAuthToken ? '••••••••' : '' });
    } catch (err) { return res.status(500).json({ error: 'Internal server error' }); }
  });

  app.post('/api/settings', requireAuth, async (req, res) => {
    try {
      const body = { ...req.body };
      if (body.twilioAuthToken === '••••••••') delete body.twilioAuthToken;
      const updated = await updateSettings(body);
      return res.json({ success: true, settings: { ...updated, twilioAuthToken: updated.twilioAuthToken ? '••••••••' : '' } });
    } catch (err) { return res.status(500).json({ error: 'Internal server error' }); }
  });

  // ─── Vite / Static frontend ────────────────────────────────────────────────
  if (process.env.NODE_ENV !== 'production') {
    // Dev: Vite runs separately on :5173 with proxy to :3001
    // This server only serves the API in dev mode
    app.use('*', (_req, res) => res.status(404).json({ error: 'Not found (API server — frontend runs on Vite dev server)' }));
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✓ Armstrong Gym API server running on http://localhost:${PORT}`);
    console.log(`  NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
