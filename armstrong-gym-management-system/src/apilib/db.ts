/**
 * Shared Neon PostgreSQL pool re-exported from src/db.ts.
 * All Vercel serverless API routes import from here.
 */
export {
  pool,
  createTables,
  seedDbIfNeeded,
  ensureDb,
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
  // admin
  getAdminByEmail,
  getAdminById,
} from '../db';
