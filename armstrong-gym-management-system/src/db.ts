import 'dotenv/config';
import { Pool, types } from 'pg';
import {
  initialAdmin,
  initialMembers,
  initialPayments,
  initialAttendance,
  initialTrainers,
  initialExpenses,
  initialReminderLogs,
} from './data/seedData';
import { AdminUser, Member, Payment, Attendance, Trainer, Expense, ReminderLog } from './types';

// Parse NUMERIC columns as float, not string
types.setTypeParser(1700, parseFloat);

// Lazy pool — created on first use so a missing env var produces a
// proper JSON 500 from the handler instead of a module-level crash.
let _pool: Pool | null = null;

export function getPool(): Pool {
  if (_pool) return _pool;

  const connectionString = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('NEON_DATABASE_URL environment variable is not set');
  }

  const isLocalDb =
    /localhost|127\.0\.0\.1/.test(connectionString) &&
    !connectionString.includes('sslmode=require');

  _pool = new Pool({
    connectionString,
    ...(isLocalDb ? {} : { ssl: { rejectUnauthorized: false } }),
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  return _pool;
}

// Keep a `pool` export for any code that references it directly
export const pool = new Proxy({} as Pool, {
  get(_target, prop) {
    return (getPool() as any)[prop];
  },
});

async function query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const client = await getPool().connect();
  try {
    const result = await client.query<T>(sql, params);
    return result.rows;
  } finally {
    client.release();
  }
}

async function execute(sql: string, params: any[] = []): Promise<void> {
  await query(sql, params);
}

export interface DbSettings {
  gymName: string;
  twilioAccountSid: string;
  twilioAuthToken: string;
  twilioWhatsappFrom: string;
  cronSecret: string;
}

// ─── Table Creation ────────────────────────────────────────────────────────────
export async function createTables(): Promise<void> {
  await execute(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'Admin'
    )
  `);

  await execute(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY DEFAULT 1,
      gym_name TEXT NOT NULL DEFAULT 'Armstrong Gym & Fitness Club',
      twilio_account_sid TEXT NOT NULL DEFAULT '',
      twilio_auth_token TEXT NOT NULL DEFAULT '',
      twilio_whatsapp_from TEXT NOT NULL DEFAULT 'whatsapp:+14155238886',
      cron_secret TEXT NOT NULL DEFAULT 'armstrong-secret-cron-2026'
    )
  `);

  await execute(`
    CREATE TABLE IF NOT EXISTS members (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      gender TEXT NOT NULL DEFAULT 'Male',
      date_of_birth TEXT,
      address TEXT,
      photo_url TEXT,
      plan_type TEXT NOT NULL DEFAULT 'Monthly',
      plan_duration_months INTEGER NOT NULL DEFAULT 1,
      plan_cost NUMERIC NOT NULL DEFAULT 0,
      amount_paid NUMERIC NOT NULL DEFAULT 0,
      remaining_balance NUMERIC NOT NULL DEFAULT 0,
      start_date TEXT NOT NULL,
      expiry_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Active',
      trainer_id TEXT,
      emergency_contact TEXT,
      qr_code_url TEXT,
      notes TEXT,
      created_at TEXT NOT NULL
    )
  `);

  await execute(`
    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      member_id TEXT NOT NULL,
      member_name TEXT NOT NULL,
      amount NUMERIC NOT NULL,
      payment_method TEXT NOT NULL DEFAULT 'Cash',
      date TEXT NOT NULL,
      transaction_id TEXT,
      bill_url TEXT,
      verification_status TEXT DEFAULT 'Verified',
      verified_by TEXT,
      verified_at TEXT,
      notes TEXT
    )
  `);

  await execute(`
    CREATE TABLE IF NOT EXISTS attendance (
      id TEXT PRIMARY KEY,
      member_id TEXT NOT NULL,
      member_name TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      check_in_method TEXT NOT NULL DEFAULT 'Manual'
    )
  `);

  await execute(`
    CREATE TABLE IF NOT EXISTS trainers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL DEFAULT '',
      specialty TEXT NOT NULL DEFAULT 'Fitness & Conditioning',
      salary NUMERIC NOT NULL DEFAULT 0,
      shift TEXT NOT NULL DEFAULT 'Morning',
      status TEXT NOT NULL DEFAULT 'Active',
      joining_date TEXT NOT NULL
    )
  `);

  await execute(`
    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      amount NUMERIC NOT NULL,
      category TEXT NOT NULL DEFAULT 'Misc',
      date TEXT NOT NULL,
      notes TEXT
    )
  `);

  await execute(`
    CREATE TABLE IF NOT EXISTS reminder_logs (
      id TEXT PRIMARY KEY,
      member_id TEXT NOT NULL,
      member_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      sent_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Sent'
    )
  `);
}

// ─── Seed ──────────────────────────────────────────────────────────────────────
export async function seedDbIfNeeded(): Promise<void> {
  const bcrypt = await import('bcryptjs');

  // Seed admin
  const adminRows = await query('SELECT id FROM admin_users LIMIT 1');
  if (adminRows.length === 0) {
    const rawPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const hash = await bcrypt.hash(rawPassword, 12);
    await execute(
      `INSERT INTO admin_users (id, name, email, password_hash, role) VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email) DO NOTHING`,
      [initialAdmin.id, initialAdmin.name, process.env.ADMIN_EMAIL || initialAdmin.email, hash, initialAdmin.role]
    );
  }

  // Seed settings
  const settingsRows = await query('SELECT id FROM settings LIMIT 1');
  if (settingsRows.length === 0) {
    await execute(
      `INSERT INTO settings (id, gym_name, twilio_account_sid, twilio_auth_token, twilio_whatsapp_from, cron_secret)
       VALUES (1, $1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING`,
      [
        process.env.GYM_NAME || 'Armstrong Gym & Fitness Club',
        process.env.TWILIO_ACCOUNT_SID || '',
        process.env.TWILIO_AUTH_TOKEN || '',
        process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886',
        process.env.CRON_SECRET || 'armstrong-secret-cron-2026',
      ]
    );
  }

  // Seed demo members
  const memberRows = await query('SELECT id FROM members LIMIT 1');
  if (memberRows.length === 0) {
    for (const m of initialMembers) {
      await execute(
        `INSERT INTO members (id,name,email,phone,gender,date_of_birth,address,photo_url,plan_type,
          plan_duration_months,plan_cost,amount_paid,remaining_balance,start_date,expiry_date,status,
          trainer_id,emergency_contact,qr_code_url,notes,created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
         ON CONFLICT (id) DO NOTHING`,
        [m.id,m.name,m.email,m.phone,m.gender,m.dateOfBirth,m.address,m.photoUrl,m.planType,
         m.planDurationMonths,m.planCost,m.amountPaid,m.remainingBalance,m.startDate,m.expiryDate,
         m.status,m.trainerId,m.emergencyContact,m.qrCodeUrl,m.notes,m.createdAt]
      );
    }
  }

  // Seed payments
  const payRows = await query('SELECT id FROM payments LIMIT 1');
  if (payRows.length === 0) {
    for (const p of initialPayments) {
      await execute(
        `INSERT INTO payments (id,member_id,member_name,amount,payment_method,date,transaction_id,
          bill_url,verification_status,verified_by,verified_at,notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT (id) DO NOTHING`,
        [p.id,p.memberId,p.memberName,p.amount,p.paymentMethod,p.date,p.transactionId,
         p.billUrl,p.verificationStatus,p.verifiedBy,p.verifiedAt,p.notes]
      );
    }
  }

  // Seed attendance
  const attRows = await query('SELECT id FROM attendance LIMIT 1');
  if (attRows.length === 0) {
    for (const a of initialAttendance) {
      await execute(
        `INSERT INTO attendance (id,member_id,member_name,date,time,check_in_method)
         VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO NOTHING`,
        [a.id,a.memberId,a.memberName,a.date,a.time,a.checkInMethod]
      );
    }
  }

  // Seed trainers
  const trRows = await query('SELECT id FROM trainers LIMIT 1');
  if (trRows.length === 0) {
    for (const t of initialTrainers) {
      await execute(
        `INSERT INTO trainers (id,name,phone,email,specialty,salary,shift,status,joining_date)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (id) DO NOTHING`,
        [t.id,t.name,t.phone,t.email,t.specialty,t.salary,t.shift,t.status,t.joiningDate]
      );
    }
  }

  // Seed expenses
  const expRows = await query('SELECT id FROM expenses LIMIT 1');
  if (expRows.length === 0) {
    for (const e of initialExpenses) {
      await execute(
        `INSERT INTO expenses (id,title,amount,category,date,notes)
         VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO NOTHING`,
        [e.id,e.title,e.amount,e.category,e.date,e.notes]
      );
    }
  }

  // Seed reminder logs
  const logRows = await query('SELECT id FROM reminder_logs LIMIT 1');
  if (logRows.length === 0) {
    for (const l of initialReminderLogs) {
      await execute(
        `INSERT INTO reminder_logs (id,member_id,member_name,phone,type,message,sent_at,status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO NOTHING`,
        [l.id,l.memberId,l.memberName,l.phone,l.type,l.message,l.sentAt,l.status]
      );
    }
  }
}

let dbInitPromise: Promise<void> | null = null;

/** Idempotent schema + seed setup (safe on every cold start). */
export async function ensureDb(): Promise<void> {
  if (!dbInitPromise) {
    dbInitPromise = createTables().then(() => seedDbIfNeeded());
  }
  return dbInitPromise;
}

// ─── Member queries ────────────────────────────────────────────────────────────
const MEMBER_SELECT = `
  SELECT id, name, email, phone, gender,
    date_of_birth AS "dateOfBirth", address, photo_url AS "photoUrl",
    plan_type AS "planType", plan_duration_months AS "planDurationMonths",
    plan_cost AS "planCost", amount_paid AS "amountPaid",
    remaining_balance AS "remainingBalance",
    start_date AS "startDate", expiry_date AS "expiryDate",
    status, trainer_id AS "trainerId", emergency_contact AS "emergencyContact",
    qr_code_url AS "qrCodeUrl", notes, created_at AS "createdAt"
  FROM members
`;

export async function getMembers(): Promise<Member[]> {
  return query<Member>(MEMBER_SELECT + ' ORDER BY id');
}

export async function getMemberById(id: string): Promise<Member | null> {
  const rows = await query<Member>(MEMBER_SELECT + ' WHERE id = $1', [id]);
  return rows[0] ?? null;
}

export async function insertMember(m: Member): Promise<void> {
  await execute(
    `INSERT INTO members (id,name,email,phone,gender,date_of_birth,address,photo_url,plan_type,
      plan_duration_months,plan_cost,amount_paid,remaining_balance,start_date,expiry_date,status,
      trainer_id,emergency_contact,qr_code_url,notes,created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)`,
    [m.id,m.name,m.email,m.phone,m.gender,m.dateOfBirth,m.address,m.photoUrl,m.planType,
     m.planDurationMonths,m.planCost,m.amountPaid,m.remainingBalance,m.startDate,m.expiryDate,
     m.status,m.trainerId,m.emergencyContact,m.qrCodeUrl,m.notes,m.createdAt]
  );
}

export async function updateMemberRecord(id: string, m: Partial<Member>): Promise<Member | null> {
  const fields: string[] = [];
  const vals: any[] = [];
  let i = 1;
  const map: Record<string, string> = {
    name: 'name', email: 'email', phone: 'phone', gender: 'gender',
    dateOfBirth: 'date_of_birth', address: 'address', photoUrl: 'photo_url',
    planType: 'plan_type', planDurationMonths: 'plan_duration_months',
    planCost: 'plan_cost', amountPaid: 'amount_paid', remainingBalance: 'remaining_balance',
    startDate: 'start_date', expiryDate: 'expiry_date', status: 'status',
    trainerId: 'trainer_id', emergencyContact: 'emergency_contact',
    qrCodeUrl: 'qr_code_url', notes: 'notes',
  };
  for (const [key, col] of Object.entries(map)) {
    if (key in m) { fields.push(`${col} = $${i++}`); vals.push((m as any)[key]); }
  }
  if (fields.length === 0) return getMemberById(id);
  vals.push(id);
  await execute(`UPDATE members SET ${fields.join(', ')} WHERE id = $${i}`, vals);
  return getMemberById(id);
}

export async function deleteMemberRecord(id: string): Promise<void> {
  await execute('DELETE FROM payments WHERE member_id = $1', [id]);
  await execute('DELETE FROM attendance WHERE member_id = $1', [id]);
  await execute('DELETE FROM members WHERE id = $1', [id]);
}

// ─── Payment queries ───────────────────────────────────────────────────────────
const PAYMENT_SELECT = `
  SELECT id, member_id AS "memberId", member_name AS "memberName", amount,
    payment_method AS "paymentMethod", date,
    transaction_id AS "transactionId", bill_url AS "billUrl",
    verification_status AS "verificationStatus",
    verified_by AS "verifiedBy", verified_at AS "verifiedAt", notes
  FROM payments
`;

export async function getPayments(): Promise<Payment[]> {
  return query<Payment>(PAYMENT_SELECT + ' ORDER BY date DESC');
}

export async function getPaymentById(id: string): Promise<Payment | null> {
  const rows = await query<Payment>(PAYMENT_SELECT + ' WHERE id = $1', [id]);
  return rows[0] ?? null;
}

export async function insertPayment(p: Payment): Promise<void> {
  await execute(
    `INSERT INTO payments (id,member_id,member_name,amount,payment_method,date,
      transaction_id,bill_url,verification_status,verified_by,verified_at,notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
    [p.id,p.memberId,p.memberName,p.amount,p.paymentMethod,p.date,
     p.transactionId,p.billUrl,p.verificationStatus,p.verifiedBy,p.verifiedAt,p.notes]
  );
}

export async function updatePaymentRecord(id: string, updates: Partial<Payment>): Promise<void> {
  const map: Record<string, string> = {
    verificationStatus: 'verification_status',
    verifiedBy: 'verified_by',
    verifiedAt: 'verified_at',
  };
  const fields: string[] = [];
  const vals: any[] = [];
  let i = 1;
  for (const [key, col] of Object.entries(map)) {
    if (key in updates) { fields.push(`${col} = $${i++}`); vals.push((updates as any)[key]); }
  }
  if (fields.length === 0) return;
  vals.push(id);
  await execute(`UPDATE payments SET ${fields.join(', ')} WHERE id = $${i}`, vals);
}

export async function deletePaymentRecord(id: string): Promise<Payment | null> {
  const p = await getPaymentById(id);
  if (p) await execute('DELETE FROM payments WHERE id = $1', [id]);
  return p;
}

// ─── Attendance queries ────────────────────────────────────────────────────────
const ATTENDANCE_SELECT = `
  SELECT id, member_id AS "memberId", member_name AS "memberName",
    date, time, check_in_method AS "checkInMethod"
  FROM attendance
`;

export async function getAttendance(): Promise<Attendance[]> {
  return query<Attendance>(ATTENDANCE_SELECT + ' ORDER BY date DESC, time DESC');
}

export async function getTodayCheckIn(memberId: string, date: string): Promise<Attendance | null> {
  const rows = await query<Attendance>(
    ATTENDANCE_SELECT + ' WHERE member_id = $1 AND date = $2',
    [memberId, date]
  );
  return rows[0] ?? null;
}

export async function insertAttendance(a: Attendance): Promise<void> {
  await execute(
    `INSERT INTO attendance (id,member_id,member_name,date,time,check_in_method)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [a.id,a.memberId,a.memberName,a.date,a.time,a.checkInMethod]
  );
}

// ─── Trainer queries ───────────────────────────────────────────────────────────
const TRAINER_SELECT = `
  SELECT id, name, phone, email, specialty, salary, shift, status,
    joining_date AS "joiningDate"
  FROM trainers
`;

export async function getTrainers(): Promise<Trainer[]> {
  return query<Trainer>(TRAINER_SELECT + ' ORDER BY id');
}

export async function insertTrainer(t: Trainer): Promise<void> {
  await execute(
    `INSERT INTO trainers (id,name,phone,email,specialty,salary,shift,status,joining_date)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [t.id,t.name,t.phone,t.email,t.specialty,t.salary,t.shift,t.status,t.joiningDate]
  );
}

export async function updateTrainerRecord(id: string, t: Partial<Trainer>): Promise<Trainer | null> {
  const map: Record<string,string> = {
    name:'name', phone:'phone', email:'email', specialty:'specialty',
    salary:'salary', shift:'shift', status:'status', joiningDate:'joining_date',
  };
  const fields: string[] = [];
  const vals: any[] = [];
  let i = 1;
  for (const [key, col] of Object.entries(map)) {
    if (key in t) { fields.push(`${col} = $${i++}`); vals.push((t as any)[key]); }
  }
  if (fields.length === 0) {
    const rows = await query<Trainer>(TRAINER_SELECT + ' WHERE id = $1', [id]);
    return rows[0] ?? null;
  }
  vals.push(id);
  await execute(`UPDATE trainers SET ${fields.join(', ')} WHERE id = $${i}`, vals);
  const rows = await query<Trainer>(TRAINER_SELECT + ' WHERE id = $1', [id]);
  return rows[0] ?? null;
}

export async function deleteTrainerRecord(id: string): Promise<void> {
  await execute('DELETE FROM trainers WHERE id = $1', [id]);
}

// ─── Expense queries ───────────────────────────────────────────────────────────
export async function getExpenses(): Promise<Expense[]> {
  return query<Expense>(
    `SELECT id, title, amount, category, date, notes FROM expenses ORDER BY date DESC`
  );
}

export async function insertExpense(e: Expense): Promise<void> {
  await execute(
    `INSERT INTO expenses (id,title,amount,category,date,notes) VALUES ($1,$2,$3,$4,$5,$6)`,
    [e.id, e.title, e.amount, e.category, e.date, e.notes]
  );
}

export async function deleteExpenseRecord(id: string): Promise<void> {
  await execute('DELETE FROM expenses WHERE id = $1', [id]);
}

// ─── Reminder Log queries ──────────────────────────────────────────────────────
const LOG_SELECT = `
  SELECT id, member_id AS "memberId", member_name AS "memberName",
    phone, type, message, sent_at AS "sentAt", status
  FROM reminder_logs
`;

export async function getReminderLogs(): Promise<ReminderLog[]> {
  return query<ReminderLog>(LOG_SELECT + ' ORDER BY sent_at DESC');
}

export async function insertReminderLog(l: ReminderLog): Promise<void> {
  await execute(
    `INSERT INTO reminder_logs (id,member_id,member_name,phone,type,message,sent_at,status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [l.id, l.memberId, l.memberName, l.phone, l.type, l.message, l.sentAt, l.status]
  );
}

// ─── Settings queries ──────────────────────────────────────────────────────────
export async function getSettings(): Promise<DbSettings> {
  const rows = await query<DbSettings>(
    `SELECT gym_name AS "gymName", twilio_account_sid AS "twilioAccountSid",
      twilio_auth_token AS "twilioAuthToken", twilio_whatsapp_from AS "twilioWhatsappFrom",
      cron_secret AS "cronSecret"
     FROM settings WHERE id = 1`
  );
  return rows[0] ?? {
    gymName: process.env.GYM_NAME || 'Armstrong Gym & Fitness Club',
    twilioAccountSid: '', twilioAuthToken: '',
    twilioWhatsappFrom: 'whatsapp:+14155238886',
    cronSecret: process.env.CRON_SECRET || 'armstrong-secret-cron-2026',
  };
}

export async function updateSettings(s: Partial<DbSettings>): Promise<DbSettings> {
  const map: Record<string,string> = {
    gymName: 'gym_name', twilioAccountSid: 'twilio_account_sid',
    twilioAuthToken: 'twilio_auth_token', twilioWhatsappFrom: 'twilio_whatsapp_from',
    cronSecret: 'cron_secret',
  };
  const fields: string[] = [];
  const vals: any[] = [];
  let i = 1;
  for (const [key, col] of Object.entries(map)) {
    if (key in s) { fields.push(`${col} = $${i++}`); vals.push((s as any)[key]); }
  }
  if (fields.length > 0) {
    vals.push(1);
    await execute(`UPDATE settings SET ${fields.join(', ')} WHERE id = $${i}`, vals);
  }
  return getSettings();
}

// ─── Admin user queries ────────────────────────────────────────────────────────
export async function getAdminByEmail(email: string): Promise<(AdminUser & { passwordHash: string }) | null> {
  const rows = await query<AdminUser & { passwordHash: string }>(
    `SELECT id, name, email, role, password_hash AS "passwordHash"
     FROM admin_users WHERE email = $1`,
    [email]
  );
  return rows[0] ?? null;
}

export async function getAdminById(id: string): Promise<AdminUser | null> {
  const rows = await query<AdminUser>(
    `SELECT id, name, email, role FROM admin_users WHERE id = $1`,
    [id]
  );
  return rows[0] ?? null;
}

// ─── ID generators ─────────────────────────────────────────────────────────────
export async function nextMemberId(): Promise<string> {
  const rows = await query<{ id: string }>('SELECT id FROM members ORDER BY id DESC LIMIT 1');
  if (rows.length === 0) return 'GM-001';
  const match = rows[0].id.match(/^GM-(\d+)$/);
  const n = match ? parseInt(match[1], 10) + 1 : 1;
  return `GM-${String(n).padStart(3, '0')}`;
}

export async function nextPaymentId(): Promise<string> {
  const rows = await query<{ count: string }>('SELECT COUNT(*) FROM payments');
  return `PAY-${1000 + Number(rows[0].count) + 1}`;
}

export async function nextAttendanceId(): Promise<string> {
  const rows = await query<{ count: string }>('SELECT COUNT(*) FROM attendance');
  return `ATT-${5000 + Number(rows[0].count) + 1}`;
}

export async function nextTrainerId(): Promise<string> {
  const rows = await query<{ count: string }>('SELECT COUNT(*) FROM trainers');
  return `TR-${String(Number(rows[0].count) + 1).padStart(2, '0')}`;
}

export async function nextExpenseId(): Promise<string> {
  const rows = await query<{ count: string }>('SELECT COUNT(*) FROM expenses');
  return `EXP-${2000 + Number(rows[0].count) + 1}`;
}

export async function nextLogId(): Promise<string> {
  const rows = await query<{ count: string }>('SELECT COUNT(*) FROM reminder_logs');
  return `LOG-${3000 + Number(rows[0].count) + 1}`;
}
