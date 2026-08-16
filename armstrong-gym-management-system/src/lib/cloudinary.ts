/**
 * Cloudinary upload helper — used by both the Express dev server and
 * Vercel serverless API routes.
 *
 * Required env vars:
 *   CLOUDINARY_CLOUD_NAME
 *   CLOUDINARY_API_KEY
 *   CLOUDINARY_API_SECRET
 *
 * Falls back gracefully: if the env vars are absent the function returns
 * the original data-URI / URL unchanged so the app keeps working without
 * Cloudinary configured (dev / demo mode).
 */

interface CloudinaryUploadResult {
  url: string;         // HTTPS delivery URL
  publicId: string;    // Cloudinary asset public_id (for future management)
  width: number;
  height: number;
  format: string;
  bytes: number;
}

/**
 * Upload an image (supplied as a base64 data-URI or an HTTPS URL) to
 * Cloudinary and return the permanent CDN URL.
 *
 * @param source   base64 data-URI ("data:image/...;base64,...") or URL string
 * @param folder   Cloudinary folder to store the asset in (e.g. "members")
 * @returns        Cloudinary HTTPS URL, or `source` unchanged if Cloudinary is not configured
 */
export async function uploadToCloudinary(
  source: string,
  folder: 'members' | 'trainers' | 'bills' = 'members'
): Promise<string> {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey    = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  // No Cloudinary config — return source unchanged (dev / demo fallback)
  if (!cloudName || !apiKey || !apiSecret) {
    return source;
  }

  // Already a remote Cloudinary URL or any non-data-URI — nothing to upload
  if (!source.startsWith('data:')) {
    return source;
  }

  try {
    // Build the signed upload request using Cloudinary's REST API directly
    // (avoids adding the heavy cloudinary SDK to the bundle).
    const timestamp = Math.floor(Date.now() / 1000);

    // Sign: folder + timestamp + secret
    const crypto = await import('crypto');
    const toSign  = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
    const signature = crypto.createHash('sha1').update(toSign).digest('hex');

    const body = new URLSearchParams();
    body.set('file',      source);
    body.set('folder',    folder);
    body.set('timestamp', String(timestamp));
    body.set('api_key',   apiKey);
    body.set('signature', signature);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      { method: 'POST', body }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error('[cloudinary] upload failed:', response.status, errText);
      // Fall back to original source rather than hard-failing the whole request
      return source;
    }

    const data: CloudinaryUploadResult & { secure_url: string; public_id: string } =
      await response.json();

    // Return the HTTPS secure_url
    return data.secure_url ?? source;
  } catch (err) {
    console.error('[cloudinary] upload error:', err);
    return source;
  }
}

/**
 * Returns true if the value looks like a base64 data-URI (needs uploading).
 */
export function isDataUri(value: string | undefined | null): boolean {
  return typeof value === 'string' && value.startsWith('data:');
}
