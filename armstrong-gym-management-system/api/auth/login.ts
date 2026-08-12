import type { VercelRequest, VercelResponse } from '@vercel/node';
import bcrypt from 'bcryptjs';
import { applyCors } from '../_lib/cors';
import { readBody } from '../_lib/helpers';
import { signToken } from '../_lib/auth';
import { ensureDb, getAdminByEmail } from '../_lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req as any, res as any)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
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
