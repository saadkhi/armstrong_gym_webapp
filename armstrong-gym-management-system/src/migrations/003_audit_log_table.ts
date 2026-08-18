/**
 * Migration 003 — Add audit_log table
 *
 * Tracks admin actions: member create/update/delete and payment
 * verify/delete.  Each row records who did what, when, and the
 * before/after JSON snapshot of the affected row.
 */

import type { Migration } from './runner';

export const migration003: Migration = {
  version: '003',
  name:    'audit_log_table',
  async up(client) {
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id          TEXT         PRIMARY KEY,
        action      TEXT         NOT NULL,   -- e.g. 'member.create', 'payment.verify'
        entity_type TEXT         NOT NULL,   -- 'member' | 'payment' | 'expense' | …
        entity_id   TEXT         NOT NULL,   -- PK of the affected row
        actor       TEXT         NOT NULL,   -- admin email / 'system' for cron
        performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        before_json  JSONB,                  -- snapshot before the change (null for creates)
        after_json   JSONB,                  -- snapshot after the change (null for deletes)
        metadata     JSONB                   -- extra context (IP, user-agent, etc.)
      )
    `);

    // Fast range-scan for recent activity feed
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_log_performed_at
        ON audit_log (performed_at DESC)
    `);

    // Per-entity timeline
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_log_entity
        ON audit_log (entity_type, entity_id)
    `);

    // Per-actor history
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_log_actor
        ON audit_log (actor)
    `);
  },
};
