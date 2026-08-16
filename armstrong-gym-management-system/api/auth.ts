import type { VercelRequest, VercelResponse } from '@vercel/node';
import bcrypt from 'bcryptjs';
import { applyCors } from '../src/apilib/cors';
import { authenticateRequest, signToken } from '../src/apilib/auth';
import { readBody } from '../src/apilib/helpers';
import { ensureDb, getAdminByEmail, getAdminById } from '../src/apilib/db';
import { checkRateLimit, pruneExpiredEntries, getClientIp } from '../src/apilib/rateLimit';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req as any, res as any)) return;

  pruneExpiredEntries();

  // _route is injected by vercel.json rewrite query params
  const route = (req.query._route as string) || '';
  const url = req.url || '';
  const isLogin = route === 'login' || url.includes('/login');
  const isMe = route === 'me' || url.includes('/me');

  // POST /api/auth/login
  if (isLogin && req.method === 'POST') {
    // Rate limit: 10 attempts per IP per 15 minutes
    const ip = getClientIp(req.headers as any);
    const rl = checkRateLimit(`login:${ip}`, 10, 15 * 60 * 1000);
    if (rl.limited) {
      res.setHeader('Retry-After', String(rl.retryAfterSecs));
      return res.status(429).json({
        success: false,
        error: `Too many login attempts. Please try again in ${Math.ceil(rl.retryAfterSecs / 60)} minute(s).`,
      });
    }

    try {
      // Diagnostic: catch missing env vars early with a clear message
      if (!process.env.NEON_DATABASE_URL && !process.env.DATABASE_URL) {
        return res.status(500).json({ success: false, error: 'Server misconfiguration: NEON_DATABASE_URL is not set' });
      }
      if (!process.env.JWT_SECRET) {
        return res.status(500).json({ success: false, error: 'Server misconfiguration: JWT_SECRET is not set' });
      }
      await ensureDb();
      const { email, password } = await readBody<{ email: string; password: string }>(req as any);
      if (!email || !password) {
        return res.status(400).json({ success: false, error: 'Email and password are required' });
      }
      const admin = await getAdminByEmail(email.trim().toLowerCase());
      if (!admin) {
        return res.status(401).json({ success: false, error: 'Invalid email or password' });
      }
      const valid = await bcrypt.compare(password, admin.passwordHash);
      if (!valid) {
        return res.status(401).json({ success: false, error: 'Invalid email or password' });
      }
      const token = signToken({ sub: admin.id, email: admin.email, role: admin.role });
      return res.status(200).json({
        success: true,
        token,
        user: { id: admin.id, name: admin.name, email: admin.email, role: admin.role },
      });
    } catch (err: any) {
      console.error('[auth/login]', err);
      return res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  // GET /api/auth/me
  if (isMe && req.method === 'GET') {
    const payload = authenticateRequest(req as any);
    if (!payload) return res.status(401).json({ success: false, error: 'Unauthorized' });
    try {
      const admin = await getAdminById(payload.sub);
      if (!admin) return res.status(404).json({ success: false, error: 'Admin not found' });
      return res.status(200).json({ success: true, user: admin });
    } catch (err: any) {
      console.error('[auth/me]', err);
      return res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
