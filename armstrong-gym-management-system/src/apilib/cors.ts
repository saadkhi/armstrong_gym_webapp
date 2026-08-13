import type { IncomingMessage, ServerResponse } from 'http';

/**
 * Apply CORS headers and handle pre-flight OPTIONS requests.
 * Returns true if the request was a pre-flight and the handler should stop.
 */
export function applyCors(req: IncomingMessage, res: ServerResponse): boolean {
  const origin = req.headers['origin'] ?? '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return true;
  }
  return false;
}
