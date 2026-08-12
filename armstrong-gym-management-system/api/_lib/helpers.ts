import type { IncomingMessage, ServerResponse } from 'http';

/** Read and parse the JSON request body. */
export async function readBody<T = any>(req: IncomingMessage): Promise<T> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

/** Send a JSON response. */
export function json(res: ServerResponse, statusCode: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
  });
  res.end(payload);
}

/** Recalculate a member's expiry status based on today's date. */
export function calcMemberStatus(expiryDate: string): 'Active' | 'Expiring' | 'Expired' {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  const diffMs = expiry.getTime() - today.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 3600 * 24));
  if (diffDays < 0) return 'Expired';
  if (diffDays <= 7) return 'Expiring';
  return 'Active';
}

/** Return a YYYY-MM-DD HH:mm:ss timestamp string for "now". */
export function nowTimestamp(): string {
  const d = new Date();
  return `${d.toISOString().split('T')[0]} ${d.toTimeString().split(' ')[0]}`;
}

/** Return YYYY-MM-DD for "today". */
export function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

/** Calculate plan expiry date from start date + duration months. */
export function calcExpiry(startDate: string, durationMonths: number): string {
  const d = new Date(startDate);
  d.setMonth(d.getMonth() + durationMonths);
  return d.toISOString().split('T')[0];
}

/** Map planType to duration in months. */
export function planDuration(planType: string): number {
  if (planType === 'Quarterly') return 3;
  if (planType === 'Half-Yearly') return 6;
  if (planType === 'Yearly') return 12;
  return 1; // Monthly
}
