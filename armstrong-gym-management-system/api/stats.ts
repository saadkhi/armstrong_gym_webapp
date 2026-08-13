import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from './lib/cors';
import { authenticateRequest } from './lib/auth';
import { todayStr, calcMemberStatus } from './lib/helpers';
import { getMembers, getPayments, getExpenses } from './lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req as any, res as any)) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const payload = authenticateRequest(req as any);
  if (!payload) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const [members, payments, expenses] = await Promise.all([
      getMembers(),
      getPayments(),
      getExpenses(),
    ]);

    // Refresh statuses in memory for stats (DB rows are updated lazily on member writes)
    const withStatus = members.map((m) => ({ ...m, status: calcMemberStatus(m.expiryDate) }));

    const today = todayStr();
    const currentMonth = today.substring(0, 7);

    const totalMembers = withStatus.length;
    const activeMembers = withStatus.filter((m) => m.status === 'Active').length;
    const expiringMembers = withStatus.filter((m) => m.status === 'Expiring').length;
    const expiredMembers = withStatus.filter((m) => m.status === 'Expired').length;

    const todaysIncome = payments
      .filter((p) => p.date.startsWith(today))
      .reduce((s, p) => s + Number(p.amount), 0);

    const monthlyIncome = payments
      .filter((p) => p.date.startsWith(currentMonth))
      .reduce((s, p) => s + Number(p.amount), 0);

    const monthlyExpenses = expenses
      .filter((e) => e.date.startsWith(currentMonth))
      .reduce((s, e) => s + Number(e.amount), 0);

    const outstandingDues = withStatus.reduce((s, m) => s + Number(m.remainingBalance), 0);
    const netProfit = monthlyIncome - monthlyExpenses;

    return res.status(200).json({
      totalMembers,
      activeMembers,
      expiringMembers,
      expiredMembers,
      todaysIncome,
      monthlyIncome,
      monthlyExpenses,
      outstandingDues,
      netProfit,
    });
  } catch (err: any) {
    console.error('[stats]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
