import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from '../src/apilib/cors';
import { authenticateRequest } from '../src/apilib/auth';
import { readBody } from '../src/apilib/helpers';
import { getSettings, updateSettings } from '../src/apilib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req as any, res as any)) return;

  const payload = authenticateRequest(req as any);
  if (!payload) return res.status(401).json({ error: 'Unauthorized' });

  // GET /api/settings
  if (req.method === 'GET') {
    try {
      const settings = await getSettings();
      // Never expose raw Twilio auth token to the client
      return res.status(200).json({
        ...settings,
        twilioAuthToken: settings.twilioAuthToken ? '••••••••' : '',
      });
    } catch (err: any) {
      console.error('[settings GET]', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // POST /api/settings
  if (req.method === 'POST') {
    try {
      const body = await readBody(req as any);
      // Don't overwrite the real auth token if the masked placeholder was sent back
      if (body.twilioAuthToken === '••••••••') delete body.twilioAuthToken;
      const updated = await updateSettings(body);
      return res.status(200).json({ success: true, settings: { ...updated, twilioAuthToken: updated.twilioAuthToken ? '••••••••' : '' } });
    } catch (err: any) {
      console.error('[settings POST]', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
