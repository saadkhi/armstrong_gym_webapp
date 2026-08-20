import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from '../src/apilib/cors';
import { authenticateRequest } from '../src/apilib/auth';
import { readBody } from '../src/apilib/helpers';
import { getSettings, updateSettings, ensureDb } from '../src/apilib/db';

/** Fields safe to return to the unauthenticated public portfolio page */
const PUBLIC_FIELDS = [
  'gymName', 'gymPhone', 'gymAddress', 'gymMapsUrl',
  'gymInstagramUrl', 'gymFacebookUrl', 'gymWhatsappBooking',
  'gymTimingsWeekday', 'gymTimingsSunday',
  'statMembers', 'statCoaches', 'statFloorSize', 'statSuccessRate',
  'heroTagline', 'plansJson',
] as const;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req as any, res as any)) return;
  await ensureDb();

  // ── GET /api/settings/public  (no auth — for Portfolio page) ─────────────
  const route = (req.query._route as string) || '';
  if (route === 'public' && req.method === 'GET') {
    try {
      const all = await getSettings();
      const pub: Record<string, string> = {};
      for (const key of PUBLIC_FIELDS) pub[key] = (all as any)[key] ?? '';
      return res.status(200).json(pub);
    } catch (err: any) {
      console.error('[settings/public GET]', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // All remaining routes require admin auth
  const payload = authenticateRequest(req as any);
  if (!payload) return res.status(401).json({ error: 'Unauthorized' });

  // ── GET /api/settings  (admin) ───────────────────────────────────────────
  if (req.method === 'GET') {
    try {
      const settings = await getSettings();
      return res.status(200).json({
        ...settings,
        twilioAuthToken: settings.twilioAuthToken ? '••••••••' : '',
      });
    } catch (err: any) {
      console.error('[settings GET]', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // ── POST /api/settings  (admin) ──────────────────────────────────────────
  if (req.method === 'POST') {
    try {
      const body = await readBody(req as any);
      if (body.twilioAuthToken === '••••••••') delete body.twilioAuthToken;
      const updated = await updateSettings(body);
      return res.status(200).json({
        success: true,
        settings: { ...updated, twilioAuthToken: updated.twilioAuthToken ? '••••••••' : '' },
      });
    } catch (err: any) {
      console.error('[settings POST]', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
