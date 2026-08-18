/**
 * Migration 001 — Add FK constraints with ON DELETE CASCADE
 *
 * Adds foreign-key relationships from payments, attendance, and
 * reminder_logs back to the members table so orphan records can
 * never accumulate.
 *
 * We use ADD CONSTRAINT … IF NOT EXISTS wrapped in DO $$ … $$ to
 * make the migration idempotent on re-runs / re-deploys.
 */

import type { Migration } from './runner';

export const migration001: Migration = {
  version: '001',
  name:    'add_fk_constraints',
  async up(client) {
    // Helper: only add constraint if it doesn't exist yet
    const addFk = async (
      table:       string,
      constraint:  string,
      column:      string,
      refTable:    string,
      refColumn:   string,
      onDelete:    string = 'CASCADE'
    ) => {
      // Check pg_constraint rather than using IF NOT EXISTS (not supported for FKs in PG < 16)
      const { rows } = await client.query<{ exists: boolean }>(
        `SELECT EXISTS (
           SELECT 1 FROM pg_constraint
           WHERE conname = $1 AND conrelid = $2::regclass
         ) AS exists`,
        [constraint, table]
      );
      if (rows[0]?.exists) return;

      await client.query(
        `ALTER TABLE ${table}
         ADD CONSTRAINT ${constraint}
         FOREIGN KEY (${column}) REFERENCES ${refTable}(${refColumn})
         ON DELETE ${onDelete}`
      );
    };

    await addFk('payments',      'fk_payments_member_id',      'member_id', 'members', 'id');
    await addFk('attendance',    'fk_attendance_member_id',    'member_id', 'members', 'id');
    await addFk('reminder_logs', 'fk_reminder_logs_member_id', 'member_id', 'members', 'id', 'SET NULL');
  },
};
