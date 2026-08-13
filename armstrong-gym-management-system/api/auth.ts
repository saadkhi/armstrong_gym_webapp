import type { VercelRequest, VercelResponse } from '@vercel/node';
import bcrypt from 'bcryptjs';
import { applyCors } from './lib/cors';
import { authenticateRequest, signToken } from './lib/auth';
import { readBody } from './lib/helpers';
import { ensureDb, getAdminByEmail, getAdminById } from './lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req as any, res as any)) return;

  // _route is injected by vercel.json rewrite query params
  const route = (req.query._route as string) || '';
  const url = req.url || '';
  const isLogin = route === 'login' || url.includes('/login');
  const isMe = route === 'me' || url.includes('/me');

  // POST /api/auth/login
  if (isLogin && req.method === 'POST') {
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
