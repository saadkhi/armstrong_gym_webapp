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

/** Resolve the required CRON_SECRET from the environment. Throws on startup if missing. */
export function getRequiredCronSecret(): string {
  const s = process.env.CRON_SECRET;
  if (!s || s.trim() === '') {
    throw new Error('CRON_SECRET environment variable is required but not set.');
  }
  return s.trim();
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
      cron_secret TEXT NOT NULL DEFAULT ''
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

  // Migrate: add new trainer profile columns if they don't exist yet
  for (const col of [
    `ALTER TABLE trainers ADD COLUMN IF NOT EXISTS photo_url TEXT NOT NULL DEFAULT ''`,
    `ALTER TABLE trainers ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT ''`,
    `ALTER TABLE trainers ADD COLUMN IF NOT EXISTS experience TEXT NOT NULL DEFAULT ''`,
    `ALTER TABLE trainers ADD COLUMN IF NOT EXISTS clients_count TEXT NOT NULL DEFAULT ''`,
    `ALTER TABLE trainers ADD COLUMN IF NOT EXISTS shift_timing TEXT NOT NULL DEFAULT ''`,
    `ALTER TABLE trainers ADD COLUMN IF NOT EXISTS bio TEXT NOT NULL DEFAULT ''`,
  ]) {
    await execute(col);
  }

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

  // ─── Indexes ──────────────────────────────────────────────────────────────────
  // All use IF NOT EXISTS so they are safe to run on every cold start / re-deploy.

  // members — fast lookups by status (dashboard counts) and expiry (cron + status refresh)
  await execute(`CREATE INDEX IF NOT EXISTS idx_members_status      ON members(status)`);
  await execute(`CREATE INDEX IF NOT EXISTS idx_members_expiry_date ON members(expiry_date)`);
  await execute(`CREATE INDEX IF NOT EXISTS idx_members_phone       ON members(phone)`);

  // payments — most queries filter or join on member_id; date prefix scans for monthly stats
  await execute(`CREATE INDEX IF NOT EXISTS idx_payments_member_id ON payments(member_id)`);
  await execute(`CREATE INDEX IF NOT EXISTS idx_payments_date       ON payments(date)`);
  await execute(`CREATE INDEX IF NOT EXISTS idx_payments_status     ON payments(verification_status)`);

  // attendance — duplicate check-in query hits (member_id, date) together; history filters by date
  await execute(`CREATE INDEX IF NOT EXISTS idx_attendance_member_date ON attendance(member_id, date)`);
  await execute(`CREATE INDEX IF NOT EXISTS idx_attendance_date        ON attendance(date)`);

  // reminder_logs — ordered reads by sent_at; filter by member_id for per-member history
  await execute(`CREATE INDEX IF NOT EXISTS idx_logs_sent_at   ON reminder_logs(sent_at DESC)`);
  await execute(`CREATE INDEX IF NOT EXISTS idx_logs_member_id ON reminder_logs(member_id)`);

  // expenses — date prefix scans for monthly expense totals
  await execute(`CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date)`);
}

// ─── Seed ──────────────────────────────────────────────────────────────────────
export async function seedDbIfNeeded(): Promise<void> {
  const bcrypt = await import('bcryptjs');

  // Always ensure the configured admin account exists with the correct password.
  // Uses UPSERT so:
  //   - First deploy: creates the admin row.
  //   - Subsequent deploys: updates email + password if env vars changed.
  const adminEmail = (process.env.ADMIN_EMAIL || initialAdmin.email).trim().toLowerCase();
  const rawPassword = process.env.ADMIN_PASSWORD;
  if (!rawPassword || rawPassword.trim() === '') {
    throw new Error('ADMIN_PASSWORD environment variable is required but not set.');
  }
  const hash = await bcrypt.hash(rawPassword, 12);
  await execute(
    `INSERT INTO admin_users (id, name, email, password_hash, role)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (id) DO UPDATE
       SET email         = EXCLUDED.email,
           password_hash = EXCLUDED.password_hash,
           name          = EXCLUDED.name`,
    [initialAdmin.id, initialAdmin.name, adminEmail, hash, initialAdmin.role]
  );

  // Seed settings
  const settingsRows = await query('SELECT id FROM settings LIMIT 1');
  if (settingsRows.length === 0) {
    const cronSecret = getRequiredCronSecret();
    await execute(
      `INSERT INTO settings (id, gym_name, twilio_account_sid, twilio_auth_token, twilio_whatsapp_from, cron_secret)
       VALUES (1, $1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING`,
      [
        process.env.GYM_NAME || 'Armstrong Gym & Fitness Club',
        process.env.TWILIO_ACCOUNT_SID || '',
        process.env.TWILIO_AUTH_TOKEN || '',
        process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886',
        cronSecret,
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
    joining_date AS "joiningDate",
    photo_url AS "photoUrl",
    role,
    experience,
    clients_count AS "clientsCount",
    shift_timing AS "shiftTiming",
    bio
  FROM trainers
`;

export async function getTrainers(): Promise<Trainer[]> {
  return query<Trainer>(TRAINER_SELECT + ' ORDER BY id');
}

export async function insertTrainer(t: Trainer): Promise<void> {
  await execute(
    `INSERT INTO trainers
       (id,name,phone,email,specialty,salary,shift,status,joining_date,
        photo_url,role,experience,clients_count,shift_timing,bio)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
    [
      t.id, t.name, t.phone, t.email, t.specialty,
      t.salary, t.shift, t.status, t.joiningDate,
      t.photoUrl || '', t.role || '', t.experience || '',
      t.clientsCount || '', t.shiftTiming || '', t.bio || '',
    ]
  );
}

export async function updateTrainerRecord(id: string, t: Partial<Trainer>): Promise<Trainer | null> {
  const map: Record<string, string> = {
    name: 'name', phone: 'phone', email: 'email', specialty: 'specialty',
    salary: 'salary', shift: 'shift', status: 'status', joiningDate: 'joining_date',
    photoUrl: 'photo_url', role: 'role', experience: 'experience',
    clientsCount: 'clients_count', shiftTiming: 'shift_timing', bio: 'bio',
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
    cronSecret: process.env.CRON_SECRET || '',
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

// ─── SQL-aggregate stats ───────────────────────────────────────────────────────
/**
 * Returns dashboard stats using a single DB round-trip with SQL aggregates
 * instead of fetching all rows into app-memory and reducing in JS.
 *
 * Member statuses are derived from expiry_date using CASE expressions so the
 * counts stay consistent with calcMemberStatus().  "Expiring" = expires within
 * the next 7 days (inclusive today).  "Expired" = expiry_date < today.
 */
export async function getStatsFromDb(): Promise<{
  totalMembers: number;
  activeMembers: number;
  expiringMembers: number;
  expiredMembers: number;
  todaysIncome: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  outstandingDues: number;
  netProfit: number;
}> {
  const today = new Date().toISOString().split('T')[0];          // YYYY-MM-DD
  const monthPrefix = today.substring(0, 7);                     // YYYY-MM

  // Member status counts + outstanding dues in one query
  const memberStats = await query<{
    total: string;
    active: string;
    expiring: string;
    expired: string;
    outstanding: string;
  }>(`
    SELECT
      COUNT(*)::TEXT                                                     AS total,
      COUNT(*) FILTER (
        WHERE expiry_date > ($1::date + INTERVAL '7 days')
      )::TEXT                                                            AS active,
      COUNT(*) FILTER (
        WHERE expiry_date >= $1::date
          AND expiry_date <= ($1::date + INTERVAL '7 days')
      )::TEXT                                                            AS expiring,
      COUNT(*) FILTER (
        WHERE expiry_date < $1::date
      )::TEXT                                                            AS expired,
      COALESCE(SUM(remaining_balance), 0)::TEXT                         AS outstanding
    FROM members
  `, [today]);

  // Payment income aggregates
  const paymentStats = await query<{
    today_income: string;
    month_income: string;
  }>(`
    SELECT
      COALESCE(SUM(amount) FILTER (WHERE date::text LIKE $1), 0)::TEXT  AS today_income,
      COALESCE(SUM(amount) FILTER (WHERE date::text LIKE $2), 0)::TEXT  AS month_income
    FROM payments
  `, [`${today}%`, `${monthPrefix}%`]);

  // Expense aggregate for current month
  const expenseStats = await query<{ month_expenses: string }>(`
    SELECT COALESCE(SUM(amount) FILTER (WHERE date LIKE $1), 0)::TEXT AS month_expenses
    FROM expenses
  `, [`${monthPrefix}%`]);

  const ms = memberStats[0];
  const ps = paymentStats[0];
  const es = expenseStats[0];

  const monthlyIncome   = parseFloat(ps.month_income);
  const monthlyExpenses = parseFloat(es.month_expenses);

  return {
    totalMembers:     parseInt(ms.total,    10),
    activeMembers:    parseInt(ms.active,   10),
    expiringMembers:  parseInt(ms.expiring, 10),
    expiredMembers:   parseInt(ms.expired,  10),
    todaysIncome:     parseFloat(ps.today_income),
    monthlyIncome,
    monthlyExpenses,
    outstandingDues:  parseFloat(ms.outstanding),
    netProfit:        monthlyIncome - monthlyExpenses,
  };
}

// ─── Paginated query helpers ───────────────────────────────────────────────────
export interface PageResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function getMembersPaged(page: number, pageSize: number): Promise<PageResult<Member>> {
  const offset = (page - 1) * pageSize;
  const [rows, countRows] = await Promise.all([
    query<Member>(MEMBER_SELECT + ' ORDER BY id LIMIT $1 OFFSET $2', [pageSize, offset]),
    query<{ count: string }>('SELECT COUNT(*)::TEXT AS count FROM members'),
  ]);
  const total = parseInt(countRows[0].count, 10);
  return { data: rows, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function getPaymentsPaged(page: number, pageSize: number): Promise<PageResult<Payment>> {
  const offset = (page - 1) * pageSize;
  const [rows, countRows] = await Promise.all([
    query<Payment>(PAYMENT_SELECT + ' ORDER BY date DESC LIMIT $1 OFFSET $2', [pageSize, offset]),
    query<{ count: string }>('SELECT COUNT(*)::TEXT AS count FROM payments'),
  ]);
  const total = parseInt(countRows[0].count, 10);
  return { data: rows, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function getAttendancePaged(page: number, pageSize: number): Promise<PageResult<Attendance>> {
  const offset = (page - 1) * pageSize;
  const [rows, countRows] = await Promise.all([
    query<Attendance>(ATTENDANCE_SELECT + ' ORDER BY date DESC, time DESC LIMIT $1 OFFSET $2', [pageSize, offset]),
    query<{ count: string }>('SELECT COUNT(*)::TEXT AS count FROM attendance'),
  ]);
  const total = parseInt(countRows[0].count, 10);
  return { data: rows, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function getExpensesPaged(page: number, pageSize: number): Promise<PageResult<Expense>> {
  const offset = (page - 1) * pageSize;
  const [rows, countRows] = await Promise.all([
    query<Expense>('SELECT id, title, amount, category, date, notes FROM expenses ORDER BY date DESC LIMIT $1 OFFSET $2', [pageSize, offset]),
    query<{ count: string }>('SELECT COUNT(*)::TEXT AS count FROM expenses'),
  ]);
  const total = parseInt(countRows[0].count, 10);
  return { data: rows, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

// ─── Transaction helpers ───────────────────────────────────────────────────────

/**
 * Runs `fn` inside a BEGIN/COMMIT block.  Rolls back automatically on any
 * error and re-throws so the caller can return a 500.
 */
export async function withTransaction<T>(fn: (client: import('pg').PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Inserts a payment record and — when status is 'Verified' — atomically
 * updates the member's amountPaid / remainingBalance in the same transaction.
 *
 * Returns the inserted payment and the (potentially updated) member.
 */
export async function insertPaymentWithBalanceUpdate(
  payment: Payment,
  applyToMember: boolean
): Promise<{ payment: Payment; member: Member | null }> {
  return withTransaction(async (client) => {
    // 1. Insert payment
    await client.query(
      `INSERT INTO payments
         (id, member_id, member_name, amount, payment_method, date,
          transaction_id, bill_url, verification_status, verified_by, verified_at, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [
        payment.id, payment.memberId, payment.memberName, payment.amount,
        payment.paymentMethod, payment.date, payment.transactionId,
        payment.billUrl ?? '', payment.verificationStatus,
        payment.verifiedBy ?? null, payment.verifiedAt ?? null, payment.notes ?? '',
      ]
    );

    if (!applyToMember) {
      // Unverified / pending — no balance change yet
      const memberRows = await client.query<Member>(
        MEMBER_SELECT + ' WHERE id = $1',
        [payment.memberId]
      );
      return { payment, member: memberRows.rows[0] ?? null };
    }

    // 2. Lock the member row for update
    const memberRows = await client.query<Member>(
      MEMBER_SELECT + ' WHERE id = $1 FOR UPDATE',
      [payment.memberId]
    );
    const member = memberRows.rows[0];
    if (!member) return { payment, member: null };

    const newPaid    = Number(member.amountPaid)  + Number(payment.amount);
    const newBalance = Math.max(0, Number(member.planCost) - newPaid);

    // 3. Update member balance
    await client.query(
      `UPDATE members SET amount_paid = $1, remaining_balance = $2 WHERE id = $3`,
      [newPaid, newBalance, member.id]
    );

    const updatedMemberRows = await client.query<Member>(
      MEMBER_SELECT + ' WHERE id = $1',
      [member.id]
    );
    return { payment, member: updatedMemberRows.rows[0] ?? null };
  });
}

/**
 * Verifies a pending payment and atomically updates the member's balance.
 * No-ops (but still succeeds) if the payment is already Verified.
 */
export async function verifyPaymentWithBalanceUpdate(
  paymentId: string,
  verifiedBy: string,
  verifiedAt: string
): Promise<{ payment: Payment | null; member: Member | null }> {
  return withTransaction(async (client) => {
    // 1. Fetch + lock the payment row
    const payRows = await client.query<Payment>(
      PAYMENT_SELECT + ' WHERE id = $1 FOR UPDATE',
      [paymentId]
    );
    const payment = payRows.rows[0];
    if (!payment) return { payment: null, member: null };

    // 2. If already verified, nothing to do
    if (payment.verificationStatus === 'Verified') {
      const memberRows = await client.query<Member>(
        MEMBER_SELECT + ' WHERE id = $1',
        [payment.memberId]
      );
      return { payment, member: memberRows.rows[0] ?? null };
    }

    // 3. Mark as verified
    await client.query(
      `UPDATE payments
       SET verification_status = 'Verified', verified_by = $1, verified_at = $2
       WHERE id = $3`,
      [verifiedBy, verifiedAt, paymentId]
    );

    // 4. Lock + update member balance
    const memberRows = await client.query<Member>(
      MEMBER_SELECT + ' WHERE id = $1 FOR UPDATE',
      [payment.memberId]
    );
    const member = memberRows.rows[0];
    if (member) {
      const newPaid    = Number(member.amountPaid)  + Number(payment.amount);
      const newBalance = Math.max(0, Number(member.planCost) - newPaid);
      await client.query(
        `UPDATE members SET amount_paid = $1, remaining_balance = $2 WHERE id = $3`,
        [newPaid, newBalance, member.id]
      );
    }

    // 5. Read back final state
    const updatedPayRows = await client.query<Payment>(
      PAYMENT_SELECT + ' WHERE id = $1',
      [paymentId]
    );
    const updatedMemberRows = member
      ? await client.query<Member>(MEMBER_SELECT + ' WHERE id = $1', [member.id])
      : { rows: [] as Member[] };

    return {
      payment: updatedPayRows.rows[0] ?? null,
      member:  updatedMemberRows.rows[0] ?? null,
    };
  });
}

/**
 * Deletes a payment and — if it was Verified — atomically subtracts its
 * amount from the member's amountPaid / remainingBalance.
 */
export async function deletePaymentWithBalanceRecalc(
  paymentId: string
): Promise<{ deleted: Payment | null; member: Member | null }> {
  return withTransaction(async (client) => {
    // 1. Fetch + lock the payment
    const payRows = await client.query<Payment>(
      PAYMENT_SELECT + ' WHERE id = $1 FOR UPDATE',
      [paymentId]
    );
    const payment = payRows.rows[0];
    if (!payment) return { deleted: null, member: null };

    // 2. Delete it
    await client.query('DELETE FROM payments WHERE id = $1', [paymentId]);

    // 3. If verified, recalculate the member balance
    if (payment.verificationStatus !== 'Verified') {
      return { deleted: payment, member: null };
    }

    const memberRows = await client.query<Member>(
      MEMBER_SELECT + ' WHERE id = $1 FOR UPDATE',
      [payment.memberId]
    );
    const member = memberRows.rows[0];
    if (!member) return { deleted: payment, member: null };

    const newPaid    = Math.max(0, Number(member.amountPaid) - Number(payment.amount));
    const newBalance = Math.max(0, Number(member.planCost) - newPaid);
    await client.query(
      `UPDATE members SET amount_paid = $1, remaining_balance = $2 WHERE id = $3`,
      [newPaid, newBalance, member.id]
    );

    const updatedMemberRows = await client.query<Member>(
      MEMBER_SELECT + ' WHERE id = $1',
      [member.id]
    );
    return { deleted: payment, member: updatedMemberRows.rows[0] ?? null };
  });
}

// ─── Duplicate phone check ─────────────────────────────────────────────────────
export async function getMemberByPhone(phone: string): Promise<Member | null> {
  const normalised = phone.replace(/\s/g, '');
  const rows = await query<Member>(
    MEMBER_SELECT + ` WHERE REPLACE(phone, ' ', '') = $1`,
    [normalised]
  );
  return rows[0] ?? null;
}

// ─── Membership renewal ────────────────────────────────────────────────────────
/**
 * Renew a member's plan atomically:
 *   - Extend expiryDate from MAX(today, current expiry) + planDurationMonths
 *   - Reset amountPaid / remainingBalance for the new cycle
 *   - Insert a verified payment record for the renewal amount
 *   - Recalculate and persist status
 *
 * Returns { member, payment }.
 */
export async function renewMembership(
  memberId: string,
  opts: {
    planType: string;
    planCost: number;
    amountPaid: number;
    paymentMethod: string;
    paymentId: string;
    transactionId?: string;
    notes?: string;
    nowTs: string;
  }
): Promise<{ member: Member; payment: Payment }> {
  return withTransaction(async (client) => {
    // 1. Lock + fetch member
    const memberRows = await client.query<Member>(
      MEMBER_SELECT + ' WHERE id = $1 FOR UPDATE',
      [memberId]
    );
    const member = memberRows.rows[0];
    if (!member) throw new Error('Member not found');

    // 2. Calculate new plan duration and expiry
    const durationMap: Record<string, number> = {
      Monthly: 1, Quarterly: 3, 'Half-Yearly': 6, Yearly: 12,
    };
    const durationMonths = durationMap[opts.planType] ?? 1;

    // Start from today or current expiry — whichever is later
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const currentExpiry = new Date(member.expiryDate);
    const renewFrom = currentExpiry > today ? currentExpiry : today;

    const newExpiry = new Date(renewFrom);
    newExpiry.setMonth(newExpiry.getMonth() + durationMonths);
    const newExpiryStr = newExpiry.toISOString().split('T')[0];

    // Determine status
    const diffDays = Math.ceil((newExpiry.getTime() - today.getTime()) / (1000 * 3600 * 24));
    const newStatus: 'Active' | 'Expiring' | 'Expired' =
      diffDays < 0 ? 'Expired' : diffDays <= 7 ? 'Expiring' : 'Active';

    const cost    = Number(opts.planCost);
    const paid    = Number(opts.amountPaid);
    const balance = Math.max(0, cost - paid);

    // 3. Update member record
    await client.query(
      `UPDATE members
         SET plan_type            = $1,
             plan_duration_months = $2,
             plan_cost            = $3,
             amount_paid          = $4,
             remaining_balance    = $5,
             start_date           = $6,
             expiry_date          = $7,
             status               = $8
       WHERE id = $9`,
      [
        opts.planType, durationMonths, cost, paid, balance,
        renewFrom.toISOString().split('T')[0], newExpiryStr, newStatus,
        memberId,
      ]
    );

    // 4. Insert payment record if any amount was paid
    const payment: Payment = {
      id:                 opts.paymentId,
      memberId:           member.id,
      memberName:         member.name,
      amount:             paid,
      paymentMethod:      opts.paymentMethod as any,
      date:               opts.nowTs,
      transactionId:      opts.transactionId || `RNW-${Date.now().toString().slice(-6)}`,
      verificationStatus: 'Verified',
      verifiedBy:         'Armstrong Admin',
      verifiedAt:         opts.nowTs,
      notes:              opts.notes || `Renewal — ${opts.planType} plan`,
    };

    if (paid > 0) {
      await client.query(
        `INSERT INTO payments
           (id, member_id, member_name, amount, payment_method, date,
            transaction_id, bill_url, verification_status, verified_by, verified_at, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [
          payment.id, payment.memberId, payment.memberName, payment.amount,
          payment.paymentMethod, payment.date, payment.transactionId,
          '', payment.verificationStatus, payment.verifiedBy, payment.verifiedAt,
          payment.notes,
        ]
      );
    }

    // 5. Read back updated member
    const updatedRows = await client.query<Member>(
      MEMBER_SELECT + ' WHERE id = $1',
      [memberId]
    );
    return { member: updatedRows.rows[0], payment };
  });
}

// ─── Historical monthly stats (last N months) ─────────────────────────────────
export interface MonthlyHistoryPoint {
  month: string;   // 'YYYY-MM'
  label: string;   // 'Jan 25', 'Feb 25', …
  income: number;
  expenses: number;
  profit: number;
}

/**
 * Returns income + expenses aggregated by calendar month for the last
 * `months` months (default 6), ordered oldest → newest.
 * Uses a single SQL query with generate_series so months with zero
 * activity still appear in the result.
 */
export async function getMonthlyHistory(months = 6): Promise<MonthlyHistoryPoint[]> {
  const rows = await query<{
    month: string;
    income: string;
    expenses: string;
  }>(`
    WITH months AS (
      SELECT to_char(
        date_trunc('month', now()) - (n || ' months')::INTERVAL,
        'YYYY-MM'
      ) AS month
      FROM generate_series(${months - 1}, 0, -1) AS n
    ),
    income_by_month AS (
      SELECT SUBSTRING(date, 1, 7) AS month,
             COALESCE(SUM(amount), 0) AS income
      FROM payments
      GROUP BY 1
    ),
    expenses_by_month AS (
      SELECT SUBSTRING(date, 1, 7) AS month,
             COALESCE(SUM(amount), 0) AS expenses
      FROM expenses
      GROUP BY 1
    )
    SELECT
      m.month,
      COALESCE(i.income,   0)::TEXT AS income,
      COALESCE(e.expenses, 0)::TEXT AS expenses
    FROM months m
    LEFT JOIN income_by_month   i ON i.month = m.month
    LEFT JOIN expenses_by_month e ON e.month = m.month
    ORDER BY m.month ASC
  `);

  return rows.map((r) => {
    const [yyyy, mm] = r.month.split('-');
    const date  = new Date(Number(yyyy), Number(mm) - 1, 1);
    const label = date.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
    const income   = parseFloat(r.income);
    const expenses = parseFloat(r.expenses);
    return { month: r.month, label, income, expenses, profit: income - expenses };
  });
}

// ─── Migration registry ────────────────────────────────────────────────────────
// Import lazily so that the migration runner is only bundled when needed
// (Vercel serverless / Express startup) and never in the browser.

let _migrationsRan = false;

/**
 * Run all pending schema migrations.
 * Safe to call on every cold start — already-applied migrations are skipped.
 * Call this after ensureDb() during server startup.
 */
export async function runSchemaMigrations(): Promise<void> {
  if (_migrationsRan) return;
  _migrationsRan = true;

  const { runMigrations }    = await import('./migrations/runner');
  const { migration001 }     = await import('./migrations/001_add_fk_constraints');
  const { migration002 }     = await import('./migrations/002_date_columns_to_date_type');
  const { migration003 }     = await import('./migrations/003_audit_log_table');

  await runMigrations([migration001, migration002, migration003]);
}

// ─── Audit log helpers ─────────────────────────────────────────────────────────

/** Generate a simple audit-log ID */
function auditId(): string {
  return `AUD-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export interface AuditEntry {
  action:     string;           // 'member.create' | 'member.update' | 'member.delete' | 'payment.verify' | 'payment.delete' | …
  entityType: string;
  entityId:   string;
  actor:      string;           // admin email or 'system'
  before?:    Record<string, unknown> | null;
  after?:     Record<string, unknown> | null;
  metadata?:  Record<string, unknown> | null;
}

/**
 * Append a row to the audit_log table.
 * Silently no-ops when the audit_log table doesn't exist yet
 * (pre-migration runs during first deploy).
 */
export async function writeAuditLog(entry: AuditEntry): Promise<void> {
  try {
    await execute(
      `INSERT INTO audit_log
         (id, action, entity_type, entity_id, actor, performed_at, before_json, after_json, metadata)
       VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7, $8)`,
      [
        auditId(),
        entry.action,
        entry.entityType,
        entry.entityId,
        entry.actor,
        entry.before  ? JSON.stringify(entry.before)  : null,
        entry.after   ? JSON.stringify(entry.after)   : null,
        entry.metadata? JSON.stringify(entry.metadata): null,
      ]
    );
  } catch (err: any) {
    // Don't break the main operation if audit logging fails
    if (!err.message?.includes('audit_log')) {
      console.error('[audit_log] write failed:', err.message);
    }
  }
}

/** Fetch the last N audit log entries for an entity */
export async function getAuditLog(
  entityType: string,
  entityId:   string,
  limit = 20
): Promise<AuditEntry[]> {
  const rows = await query<{
    action: string; entity_type: string; entity_id: string;
    actor: string; performed_at: string;
    before_json: any; after_json: any; metadata: any;
  }>(
    `SELECT action, entity_type, entity_id, actor, performed_at,
            before_json, after_json, metadata
     FROM audit_log
     WHERE entity_type = $1 AND entity_id = $2
     ORDER BY performed_at DESC
     LIMIT $3`,
    [entityType, entityId, limit]
  );

  return rows.map((r) => ({
    action:     r.action,
    entityType: r.entity_type,
    entityId:   r.entity_id,
    actor:      r.actor,
    before:     r.before_json  ?? null,
    after:      r.after_json   ?? null,
    metadata:   r.metadata     ?? null,
  }));
}
