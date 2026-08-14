import {
  Member,
  Payment,
  Attendance,
  Trainer,
  Expense,
  ReminderLog,
  SystemStats,
  AdminUser,
} from '../types';

const API_BASE = '/api';

// ─── Token helpers ─────────────────────────────────────────────────────────────
function getToken(): string | null {
  return localStorage.getItem('armstrong_admin_token');
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/** Fires window event on 401 ONLY when a token exists (real session expiry, not missing auth). */
function handleUnauthorized(res: Response) {
  if (res.status === 401 && getToken()) {
    window.dispatchEvent(new CustomEvent('armstrong:unauthorized'));
  }
}

async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const res = await fetch(url, {
    ...options,
    headers: { ...authHeaders(), ...(options.headers as Record<string, string> ?? {}) },
  });
  handleUnauthorized(res);
  return res;
}

// ─── Auth ──────────────────────────────────────────────────────────────────────
export async function loginApi(
  email: string,
  password: string
): Promise<{ success: boolean; token?: string; user?: AdminUser; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error' };
  }
}

export async function fetchCurrentUser(): Promise<{ success: boolean; user?: AdminUser; error?: string }> {
  const res = await apiFetch(`${API_BASE}/auth/me`);
  return res.json();
}

// ─── Stats ─────────────────────────────────────────────────────────────────────
export async function fetchStats(): Promise<SystemStats> {
  const res = await apiFetch(`${API_BASE}/stats`);
  if (!res.ok) throw new Error('Failed to fetch stats');
  return res.json();
}

// ─── Members ───────────────────────────────────────────────────────────────────
export async function fetchMembers(): Promise<Member[]> {
  const res = await apiFetch(`${API_BASE}/members`);
  if (!res.ok) throw new Error('Failed to fetch members');
  return res.json();
}

export async function fetchMemberById(id: string): Promise<Member> {
  const res = await apiFetch(`${API_BASE}/members/${id}`);
  if (!res.ok) throw new Error('Failed to fetch member details');
  return res.json();
}

export async function createMember(memberData: Partial<Member>): Promise<Member> {
  const res = await apiFetch(`${API_BASE}/members`, {
    method: 'POST',
    body: JSON.stringify(memberData),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to create member');
  }
  return res.json();
}

export async function updateMember(id: string, memberData: Partial<Member>): Promise<Member> {
  const res = await apiFetch(`${API_BASE}/members/${id}`, {
    method: 'PUT',
    body: JSON.stringify(memberData),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to update member');
  }
  return res.json();
}

export async function deleteMember(id: string): Promise<{ success: boolean; message: string }> {
  const res = await apiFetch(`${API_BASE}/members/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete member');
  return res.json();
}

// ─── Payments ──────────────────────────────────────────────────────────────────
export async function fetchPayments(): Promise<Payment[]> {
  const res = await apiFetch(`${API_BASE}/payments`);
  if (!res.ok) throw new Error('Failed to fetch payments');
  return res.json();
}

export async function createPayment(paymentData: {
  memberId: string;
  amount: number;
  paymentMethod: string;
  notes?: string;
  transactionId?: string;
  billUrl?: string;
  verificationStatus?: string;
}): Promise<{ payment: Payment; member: Member }> {
  const res = await apiFetch(`${API_BASE}/payments`, {
    method: 'POST',
    body: JSON.stringify(paymentData),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to record payment');
  }
  return res.json();
}

export async function verifyPayment(id: string): Promise<{
  success: boolean;
  payment: Payment;
  member: Member;
  receiptMsg: string;
  whatsappUrl: string;
}> {
  const res = await apiFetch(`${API_BASE}/payments/verify/${id}`, { method: 'POST' });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to verify payment');
  }
  return res.json();
}

export async function submitMemberBill(billData: {
  memberQuery: string;
  amount: number;
  paymentMethod: string;
  transactionId?: string;
  billUrl?: string;
  notes?: string;
}): Promise<{ success: boolean; message: string; payment: Payment }> {
  // Public endpoint — no auth token sent
  const res = await fetch(`${API_BASE}/payments/submit-bill`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(billData),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to submit payment bill');
  }
  return res.json();
}

export async function deletePayment(id: string): Promise<{ success: boolean }> {
  const res = await apiFetch(`${API_BASE}/payments/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete payment');
  return res.json();
}

// ─── Attendance ────────────────────────────────────────────────────────────────
export async function fetchAttendance(): Promise<Attendance[]> {
  const res = await apiFetch(`${API_BASE}/attendance`);
  if (!res.ok) throw new Error('Failed to fetch attendance');
  return res.json();
}

export async function checkInMember(
  memberId: string,
  checkInMethod: 'QR Scan' | 'Manual' = 'QR Scan'
): Promise<{ success: boolean; message: string; record?: Attendance; member?: Member; error?: string }> {
  const res = await apiFetch(`${API_BASE}/attendance/check-in`, {
    method: 'POST',
    body: JSON.stringify({ memberId, checkInMethod }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to check in member');
  return data;
}

// ─── Trainers ──────────────────────────────────────────────────────────────────
export async function fetchTrainers(): Promise<Trainer[]> {
  const res = await apiFetch(`${API_BASE}/trainers`);
  if (!res.ok) throw new Error('Failed to fetch trainers');
  return res.json();
}

/** Public (no auth) — used by the portfolio page */
export async function fetchPublicTrainers(): Promise<Trainer[]> {
  const res = await fetch(`${API_BASE}/trainers`);
  if (!res.ok) throw new Error('Failed to fetch trainers');
  return res.json();
}

export async function createTrainer(trainerData: Partial<Trainer>): Promise<Trainer> {
  const res = await apiFetch(`${API_BASE}/trainers`, {
    method: 'POST',
    body: JSON.stringify(trainerData),
  });
  if (!res.ok) throw new Error('Failed to create trainer');
  return res.json();
}

export async function updateTrainer(id: string, trainerData: Partial<Trainer>): Promise<Trainer> {
  const res = await apiFetch(`${API_BASE}/trainers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(trainerData),
  });
  if (!res.ok) throw new Error('Failed to update trainer');
  return res.json();
}

export async function deleteTrainer(id: string): Promise<{ success: boolean }> {
  const res = await apiFetch(`${API_BASE}/trainers/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete trainer');
  return res.json();
}

// ─── Expenses ──────────────────────────────────────────────────────────────────
export async function fetchExpenses(): Promise<Expense[]> {
  const res = await apiFetch(`${API_BASE}/expenses`);
  if (!res.ok) throw new Error('Failed to fetch expenses');
  return res.json();
}

export async function createExpense(expenseData: Partial<Expense>): Promise<Expense> {
  const res = await apiFetch(`${API_BASE}/expenses`, {
    method: 'POST',
    body: JSON.stringify(expenseData),
  });
  if (!res.ok) throw new Error('Failed to create expense');
  return res.json();
}

export async function deleteExpense(id: string): Promise<{ success: boolean }> {
  const res = await apiFetch(`${API_BASE}/expenses/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete expense');
  return res.json();
}

// ─── WhatsApp / Reminders ──────────────────────────────────────────────────────
export async function sendWhatsAppMessage(
  memberId: string,
  type: string,
  customMessage?: string
): Promise<{ success: boolean; whatsappUrl: string; log: ReminderLog }> {
  const res = await apiFetch(`${API_BASE}/whatsapp/send`, {
    method: 'POST',
    body: JSON.stringify({ memberId, type, customMessage }),
  });
  if (!res.ok) throw new Error('Failed to send WhatsApp message');
  return res.json();
}

export async function sendBatchWhatsAppUnpaid(
  targetMemberIds?: string[],
  customTemplate?: string
): Promise<{
  success: boolean;
  count: number;
  message: string;
  dispatchList: Array<{
    memberId: string;
    memberName: string;
    phone: string;
    remainingBalance: number;
    message: string;
    whatsappUrl: string;
    logId: string;
  }>;
}> {
  const res = await apiFetch(`${API_BASE}/whatsapp/batch-send-unpaid`, {
    method: 'POST',
    body: JSON.stringify({ targetMemberIds, customTemplate }),
  });
  if (!res.ok) throw new Error('Failed to send batch WhatsApp messages');
  return res.json();
}

export async function fetchReminderLogs(): Promise<ReminderLog[]> {
  const res = await apiFetch(`${API_BASE}/whatsapp/logs`);
  if (!res.ok) throw new Error('Failed to fetch reminder logs');
  return res.json();
}

// ─── Cron ──────────────────────────────────────────────────────────────────────
export async function triggerCronAutomation(secret?: string): Promise<any> {
  const res = await apiFetch(
    `${API_BASE}/cron/fee-reminders${secret ? `?secret=${encodeURIComponent(secret)}` : ''}`,
    { method: 'POST' }
  );
  if (!res.ok) throw new Error('Failed to execute cron automation');
  return res.json();
}

// ─── Settings ──────────────────────────────────────────────────────────────────
export async function fetchSettings(): Promise<any> {
  const res = await apiFetch(`${API_BASE}/settings`);
  if (!res.ok) throw new Error('Failed to fetch settings');
  return res.json();
}

export async function updateSettings(settings: any): Promise<any> {
  const res = await apiFetch(`${API_BASE}/settings`, {
    method: 'POST',
    body: JSON.stringify(settings),
  });
  if (!res.ok) throw new Error('Failed to save settings');
  return res.json();
}
