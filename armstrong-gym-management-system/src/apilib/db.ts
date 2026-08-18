/**
 * Shared Neon PostgreSQL pool re-exported from src/db.ts.
 * All Vercel serverless API routes import from here.
 */
export {
  pool,
  createTables,
  seedDbIfNeeded,
  ensureDb,
  getRequiredCronSecret,
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
  // SQL-aggregate stats
  getStatsFromDb,
  // paginated list helpers
  getMembersPaged,
  getPaymentsPaged,
  getAttendancePaged,
  getExpensesPaged,
  // transactional payment helpers
  insertPaymentWithBalanceUpdate,
  verifyPaymentWithBalanceUpdate,
  deletePaymentWithBalanceRecalc,
  // renewal + duplicate-phone
  getMemberByPhone,
  renewMembership,
  // historical chart data
  getMonthlyHistory,
  // migration runner
  runSchemaMigrations,
  // audit log
  writeAuditLog,
  getAuditLog,
} from '../db';
