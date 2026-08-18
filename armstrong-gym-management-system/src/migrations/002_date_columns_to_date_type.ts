/**
 * Migration 002 — Migrate TEXT date columns to PostgreSQL DATE / TIMESTAMPTZ
 *
 * Strategy: safe USING cast for YYYY-MM-DD strings → DATE.
 * Rows with invalid date strings are coerced to NULL (via TRY_CAST pattern)
 * rather than aborting the whole migration.
 *
 * Columns migrated:
 *   members:       start_date, expiry_date, created_at, date_of_birth
 *   payments:      date  (YYYY-MM-DD HH:mm:ss → TIMESTAMPTZ)
 *   attendance:    date  (YYYY-MM-DD → DATE)
 *   expenses:      date  (YYYY-MM-DD → DATE)
 *   trainers:      joining_date (YYYY-MM-DD → DATE)
 *   reminder_logs: sent_at (YYYY-MM-DD HH:mm:ss → TIMESTAMPTZ)
 */

import type { Migration } from './runner';

export const migration002: Migration = {
  version: '002',
  name:    'date_columns_to_date_type',
  async up(client) {
    // Helper: only alter if the column is currently TEXT
    const alterToDate = async (table: string, column: string, pgType: 'DATE' | 'TIMESTAMPTZ') => {
      const { rows } = await client.query<{ data_type: string }>(
        `SELECT data_type FROM information_schema.columns
         WHERE table_name = $1 AND column_name = $2`,
        [table, column]
      );
      if (!rows[0] || rows[0].data_type !== 'text') return; // already migrated

      const usingClause = pgType === 'TIMESTAMPTZ'
        ? `USING CASE WHEN ${column} ~ '^\\d{4}-\\d{2}-\\d{2}' THEN ${column}::TIMESTAMPTZ ELSE NULL END`
        : `USING CASE WHEN ${column} ~ '^\\d{4}-\\d{2}-\\d{2}' THEN ${column}::DATE ELSE NULL END`;

      await client.query(
        `ALTER TABLE ${table}
         ALTER COLUMN ${column} TYPE ${pgType} ${usingClause}`
      );
    };

    // members
    await alterToDate('members', 'start_date',    'DATE');
    await alterToDate('members', 'expiry_date',   'DATE');
    await alterToDate('members', 'created_at',    'DATE');
    await alterToDate('members', 'date_of_birth', 'DATE');

    // payments — stored as 'YYYY-MM-DD HH:mm:ss'
    await alterToDate('payments', 'date',       'TIMESTAMPTZ');
    await alterToDate('payments', 'verified_at', 'TIMESTAMPTZ');

    // attendance
    await alterToDate('attendance', 'date', 'DATE');

    // expenses
    await alterToDate('expenses', 'date', 'DATE');

    // trainers
    await alterToDate('trainers', 'joining_date', 'DATE');

    // reminder_logs
    await alterToDate('reminder_logs', 'sent_at', 'TIMESTAMPTZ');
  },
};
