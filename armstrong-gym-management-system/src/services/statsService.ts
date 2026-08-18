/**
 * Stats business logic — shared between Express (server.ts) and
 * Vercel serverless handlers (api/stats.ts, api/stats-history.ts).
 */

import { getStatsFromDb, getMonthlyHistory } from '../db';
import type { SystemStats } from '../types';
import type { MonthlyHistoryPoint } from '../db';

export async function getStats(): Promise<SystemStats> {
  return getStatsFromDb();
}

export async function getHistory(months = 6): Promise<MonthlyHistoryPoint[]> {
  return getMonthlyHistory(Math.min(24, Math.max(1, months)));
}
