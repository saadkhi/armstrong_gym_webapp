/**
 * Lightweight migration runner.
 *
 * Maintains a `schema_migrations` table that records which migration
 * versions have been applied.  Runs all pending migrations in order
 * on every cold start (idempotent — already-applied ones are skipped).
 *
 * Usage:
 *   import { runMigrations } from './runner';
 *   await runMigrations();   // call once during app startup, after createTables()
 */

import { getPool } from '../db';

export interface Migration {
  version: string;   // e.g. '001', '002' — must sort correctly as strings
  name:    string;   // human-readable description
  up:      (client: import('pg').PoolClient) => Promise<void>;
}

/**
 * Ensure the migrations tracking table exists.
 */
async function ensureMigrationsTable(client: import('pg').PoolClient): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version    TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

/**
 * Return the set of already-applied migration versions.
 */
async function appliedVersions(client: import('pg').PoolClient): Promise<Set<string>> {
  const res = await client.query<{ version: string }>(
    'SELECT version FROM schema_migrations ORDER BY version'
  );
  return new Set(res.rows.map((r) => r.version));
}

/**
 * Run all pending migrations from the registry in version order.
 * Each migration runs inside its own transaction so a failure leaves
 * earlier migrations committed and the failing one cleanly rolled back.
 */
export async function runMigrations(migrations: Migration[]): Promise<void> {
  const pool   = getPool();
  const sorted = [...migrations].sort((a, b) => a.version.localeCompare(b.version));

  // One client for the bookkeeping table check
  const bootstrap = await pool.connect();
  try {
    await ensureMigrationsTable(bootstrap);
    const applied = await appliedVersions(bootstrap);

    const pending = sorted.filter((m) => !applied.has(m.version));
    if (pending.length === 0) {
      console.log(`✓ Migrations: all ${sorted.length} already applied`);
      return;
    }

    console.log(`⏳ Migrations: ${pending.length} pending`);

    for (const migration of pending) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await migration.up(client);
        await client.query(
          `INSERT INTO schema_migrations (version, name) VALUES ($1, $2)
           ON CONFLICT (version) DO NOTHING`,
          [migration.version, migration.name]
        );
        await client.query('COMMIT');
        console.log(`  ✓ ${migration.version} — ${migration.name}`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`  ✗ ${migration.version} — ${migration.name} FAILED:`, err);
        throw err; // halt — don't run subsequent migrations after a failure
      } finally {
        client.release();
      }
    }
  } finally {
    bootstrap.release();
  }
}
