/**
 * Member business logic — shared between Express (server.ts) and
 * Vercel serverless handlers (api/members.ts).
 *
 * All DB access goes through the existing db.ts helpers; this layer
 * only contains the orchestration logic that was duplicated in both
 * route files.
 */

import {
  getMembers, getMemberById, insertMember, updateMemberRecord,
  deleteMemberRecord, nextMemberId, insertPayment, nextPaymentId,
  getMemberByPhone, getMembersPaged,
} from '../db';
import type { Member, Payment } from '../types';

// ── Helpers (previously inlined in both route files) ──────────────────────────

export function calcMemberStatus(expiryDate: string): 'Active' | 'Expiring' | 'Expired' {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry   = new Date(expiryDate);
  const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 3600 * 24));
  if (diffDays < 0) return 'Expired';
  if (diffDays <= 7) return 'Expiring';
  return 'Active';
}

export function planDuration(planType: string): number {
  if (planType === 'Quarterly')  return 3;
  if (planType === 'Half-Yearly') return 6;
  if (planType === 'Yearly')     return 12;
  return 1;
}

export function calcExpiry(startDate: string, durationMonths: number): string {
  const d = new Date(startDate);
  d.setMonth(d.getMonth() + durationMonths);
  return d.toISOString().split('T')[0];
}

export function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

export function nowTimestamp(): string {
  const d = new Date();
  return `${d.toISOString().split('T')[0]} ${d.toTimeString().split(' ')[0]}`;
}

// ── Service functions ─────────────────────────────────────────────────────────

/** Fetch all members with live status recalculation and lazy DB sync. */
export async function listMembers(): Promise<Member[]> {
  const members = await getMembers();
  const updated = members.map((m) => ({ ...m, status: calcMemberStatus(m.expiryDate) }));
  // Lazily sync status changes — fire-and-forget
  void Promise.allSettled(
    updated
      .filter((m, i) => m.status !== members[i].status)
      .map((m) => updateMemberRecord(m.id, { status: m.status }))
  );
  return updated;
}

/** Paginated member list. */
export async function listMembersPaged(page: number, pageSize: number) {
  const result = await getMembersPaged(page, pageSize);
  result.data = result.data.map((m) => ({ ...m, status: calcMemberStatus(m.expiryDate) }));
  return result;
}

/** Get a single member with live status. */
export async function getMember(id: string): Promise<Member | null> {
  const m = await getMemberById(id);
  if (!m) return null;
  return { ...m, status: calcMemberStatus(m.expiryDate) };
}

export interface CreateMemberInput {
  name: string;
  email?: string;
  phone?: string;
  gender?: string;
  dateOfBirth?: string;
  address?: string;
  photoUrl?: string;
  planType?: string;
  planCost?: number;
  amountPaid?: number;
  startDate?: string;
  trainerId?: string;
  emergencyContact?: string;
  notes?: string;
}

/**
 * Create a new member.
 * - Duplicate phone guard (returns 409-style error if already registered)
 * - Auto-assigns GM-XXX id
 * - Creates initial verified payment if amountPaid > 0
 */
export async function createMember(
  input: CreateMemberInput
): Promise<{ member: Member; alreadyExists?: string }> {
  if (input.phone) {
    const existing = await getMemberByPhone(input.phone);
    if (existing) {
      return {
        member: existing,
        alreadyExists: `Phone is already registered to ${existing.name} (${existing.id})`,
      };
    }
  }

  const newId    = await nextMemberId();
  const planType = input.planType || 'Monthly';
  const duration = planDuration(planType);
  const start    = input.startDate || todayStr();
  const expiry   = calcExpiry(start, duration);
  const cost     = Number(input.planCost  ?? 0);
  const paid     = Number(input.amountPaid ?? 0);

  const newMember: Member = {
    id:                newId,
    name:              input.name,
    email:             input.email             || '',
    phone:             input.phone             || '',
    gender:            (input.gender as any)   || 'Male',
    dateOfBirth:       input.dateOfBirth,
    address:           input.address,
    photoUrl:          input.photoUrl          || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    planType:          planType as any,
    planDurationMonths: duration,
    planCost:          cost,
    amountPaid:        paid,
    remainingBalance:  Math.max(0, cost - paid),
    startDate:         start,
    expiryDate:        expiry,
    status:            calcMemberStatus(expiry),
    trainerId:         input.trainerId,
    emergencyContact:  input.emergencyContact,
    notes:             input.notes,
    createdAt:         todayStr(),
  };

  await insertMember(newMember);

  if (paid > 0) {
    const payId = await nextPaymentId();
    const payment: Payment = {
      id:                 payId,
      memberId:           newId,
      memberName:         input.name,
      amount:             paid,
      paymentMethod:      'Cash',
      date:               nowTimestamp(),
      transactionId:      `TXN-${Date.now().toString().slice(-6)}`,
      verificationStatus: 'Verified',
      verifiedBy:         'Armstrong Admin',
      verifiedAt:         nowTimestamp(),
      notes:              `Initial registration payment for ${planType} plan`,
    };
    await insertPayment(payment);
  }

  return { member: newMember };
}

/** Update a member's fields, recalculating plan expiry + balance as needed. */
export async function updateMember(id: string, body: Partial<Member>): Promise<Member | null> {
  const current = await getMemberById(id);
  if (!current) return null;

  const merged: any = { ...current, ...body };
  if (body.planType || body.startDate) {
    merged.planDurationMonths = planDuration(merged.planType);
    merged.expiryDate         = calcExpiry(merged.startDate, merged.planDurationMonths);
  }
  merged.remainingBalance = Math.max(0, Number(merged.planCost) - Number(merged.amountPaid));
  merged.status           = calcMemberStatus(merged.expiryDate);

  return updateMemberRecord(id, merged);
}

/** Delete a member and their payments + attendance records. */
export async function deleteMember(id: string): Promise<boolean> {
  const member = await getMemberById(id);
  if (!member) return false;
  await deleteMemberRecord(id);
  return true;
}
