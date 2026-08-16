import type { IncomingMessage, ServerResponse } from 'http';

/**
 * Allowed origins for CORS.
 *
 * In production, set ALLOWED_ORIGINS as a comma-separated list of your
 * deployed domains, e.g.:
 *   ALLOWED_ORIGINS="https://armstrong-gym.vercel.app,https://www.armstronggym.com"
 *
 * In development (NODE_ENV !== 'production') localhost origins are always
 * permitted so the Vite dev server can reach the API.
 */
function getAllowedOrigins(): Set<string> {
  const raw = process.env.ALLOWED_ORIGINS ?? '';
  const explicit = raw
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  const origins = new Set<string>(explicit);

  // Always allow localhost in non-production environments
  if (process.env.NODE_ENV !== 'production') {
    origins.add('http://localhost:5173');
    origins.add('http://localhost:3000');
    origins.add('http://localhost:3001');
    origins.add('http://127.0.0.1:5173');
  }

  return origins;
}

/**
 * Apply CORS headers and handle pre-flight OPTIONS requests.
 *
 * Returns true if the request was a pre-flight — the handler should return
 * immediately in that case without processing further.
 *
 * Requests from unlisted origins receive no CORS headers, so the browser
 * will block the response. Requests with no Origin header (e.g. server-to-
 * server, curl) are allowed through — restrict further if needed.
 */
export function applyCors(req: IncomingMessage, res: ServerResponse): boolean {
  const origin = (req.headers['origin'] as string | undefined) ?? '';
  const allowed = getAllowedOrigins();

  if (origin && allowed.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Vary', 'Origin');
  }
  // No CORS headers for unlisted origins — browser will block.

  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return true;
  }
  return false;
}
