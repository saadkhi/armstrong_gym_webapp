/**
 * Twilio WhatsApp helper.
 *
 * Uses the Twilio Messages REST API directly (no SDK dependency) so we
 * stay lightweight.  Falls back gracefully when credentials are absent or
 * the API call fails so the app keeps working in demo mode.
 *
 * Required env / settings-table values:
 *   TWILIO_ACCOUNT_SID   e.g. ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
 *   TWILIO_AUTH_TOKEN    your auth token
 *   TWILIO_WHATSAPP_FROM e.g. whatsapp:+14155238886  (Twilio sandbox number)
 */

export interface TwilioResult {
  /** true = message accepted by Twilio, false = not sent (creds missing / error) */
  sent: boolean;
  /** Twilio message SID if sent */
  sid?: string;
  /** Fallback wa.me URL usable when Twilio is not configured */
  whatsappUrl: string;
  /** Human-readable status */
  status: 'sent' | 'fallback' | 'error';
  error?: string;
}

/**
 * Send a WhatsApp message via Twilio.
 *
 * @param to       Recipient phone number — any format, digits only after normalise
 * @param body     Message body (max ~1600 chars)
 * @param creds    Twilio credentials (accountSid, authToken, from)
 */
export async function sendWhatsAppViaTwilio(
  to: string,
  body: string,
  creds: {
    accountSid: string;
    authToken: string;
    from: string; // e.g. "whatsapp:+14155238886"
  }
): Promise<TwilioResult> {
  const digits    = to.replace(/[^0-9]/g, '');
  const whatsappUrl = `https://wa.me/${digits}?text=${encodeURIComponent(body)}`;

  // If no real credentials provided — return fallback URL
  if (!creds.accountSid || !creds.authToken || !creds.from ||
      creds.accountSid.startsWith('AC00') || creds.accountSid === '') {
    return { sent: false, whatsappUrl, status: 'fallback' };
  }

  const toWhatsApp = `whatsapp:+${digits}`;

  try {
    const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${creds.accountSid}/Messages.json`;

    const params = new URLSearchParams();
    params.set('To',   toWhatsApp);
    params.set('From', creds.from.startsWith('whatsapp:') ? creds.from : `whatsapp:${creds.from}`);
    params.set('Body', body);

    const basicAuth = Buffer.from(`${creds.accountSid}:${creds.authToken}`).toString('base64');

    const response = await fetch(endpoint, {
      method:  'POST',
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Content-Type':  'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const data = await response.json() as { sid?: string; status?: string; message?: string; code?: number };

    if (!response.ok) {
      console.error('[twilio]', data);
      return {
        sent: false, whatsappUrl, status: 'error',
        error: data.message || `Twilio error ${response.status}`,
      };
    }

    return { sent: true, sid: data.sid, whatsappUrl, status: 'sent' };
  } catch (err: any) {
    console.error('[twilio] network error:', err);
    return { sent: false, whatsappUrl, status: 'error', error: err.message };
  }
}
