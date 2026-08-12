import type { IncomingMessage } from 'http';
import jwt from 'jsonwebtoken';

export interface JwtPayload {
  sub: string;   // admin user id
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

function getSecret(): string {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error('JWT_SECRET environment variable is not set');
  return s;
}

export function signToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, getSecret(), { expiresIn: '8h' });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, getSecret()) as JwtPayload;
}

/**
 * Extract and verify the Bearer token from a request.
 * Returns the decoded payload or null if invalid / missing.
 */
export function authenticateRequest(req: IncomingMessage): JwtPayload | null {
  try {
    const header = req.headers['authorization'] ?? '';
    if (!header.startsWith('Bearer ')) return null;
    const token = header.slice(7).trim();
    return verifyToken(token);
  } catch {
    return null;
  }
}
