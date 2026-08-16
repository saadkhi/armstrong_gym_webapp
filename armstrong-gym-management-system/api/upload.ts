/**
 * POST /api/upload
 * Accepts { file: "<data-URI>", folder?: "members"|"trainers"|"bills" }
 * Returns  { url: "<cloudinary-https-url>" }
 *
 * Requires authentication — only admins can upload images.
 * Max payload: 8 MB (enforced by express-json / Vercel's 4.5 MB body limit).
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from '../src/apilib/cors';
import { authenticateRequest } from '../src/apilib/auth';
import { readBody } from '../src/apilib/helpers';
import { uploadToCloudinary } from '../src/lib/cloudinary';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req as any, res as any)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const payload = authenticateRequest(req as any);
  if (!payload) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const { file, folder = 'members' } = await readBody<{ file: string; folder?: string }>(req as any);

    if (!file || typeof file !== 'string') {
      return res.status(400).json({ error: 'file (data-URI string) is required' });
    }

    if (!file.startsWith('data:image/')) {
      return res.status(400).json({ error: 'file must be a valid image data-URI (data:image/...)' });
    }

    const validFolders = ['members', 'trainers', 'bills'];
    const uploadFolder = validFolders.includes(folder) ? folder : 'members';

    const url = await uploadToCloudinary(file, uploadFolder as 'members' | 'trainers' | 'bills');

    return res.status(200).json({ url });
  } catch (err: any) {
    console.error('[upload]', err);
    return res.status(500).json({ error: 'Image upload failed' });
  }
}
