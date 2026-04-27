type JsonRecord = Record<string, unknown>;

interface HostNotificationPayload {
  visitorId: string;
  visitorName: string;
  company: string;
  hostName: string;
  hostEmail: string;
  language: 'sv' | 'en';
  checkInTime: string;
  preBooked: boolean;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === 'object' && value !== null;

const normalizeText = (value: unknown) =>
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';

const normalizeEmail = (value: unknown) =>
  typeof value === 'string' ? value.trim().toLowerCase() : '';

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const requirePayload = (body: JsonRecord): HostNotificationPayload => {
  const payload = isRecord(body.payload) ? body.payload : body;
  const visitorName = normalizeText(payload.visitorName);
  const company = normalizeText(payload.company);
  const hostName = normalizeText(payload.hostName);
  const hostEmail = normalizeEmail(payload.hostEmail);
  const language = payload.language === 'en' ? 'en' : 'sv';
  const checkInTime = normalizeText(payload.checkInTime) || new Date().toISOString();

  if (!visitorName || !company || !hostName || !hostEmail) {
    throw new Response(JSON.stringify({
      error: 'visitorName, company, hostName and hostEmail are required.',
    }), {
      status: 400,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  }

  return {
    visitorId: normalizeText(payload.visitorId),
    visitorName,
    company,
    hostName,
    hostEmail,
    language,
    checkInTime,
    preBooked: typeof payload.preBooked === 'boolean' ? payload.preBooked : true,
  };
};

const formatCheckInTime = (isoTimestamp: string, language: 'sv' | 'en') => {
  try {
    return new Intl.DateTimeFormat(language === 'sv' ? 'sv-SE' : 'en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Europe/Stockholm',
    }).format(new Date(isoTimestamp));
  } catch {
    return isoTimestamp;
  }
};

const buildEmail = (payload: HostNotificationPayload) => {
  const checkInTime = formatCheckInTime(payload.checkInTime, payload.language);
  const visitorName = escapeHtml(payload.visitorName);
  const company = escapeHtml(payload.company);
  const hostName = escapeHtml(payload.hostName);
  const escapedCheckInTime = escapeHtml(checkInTime);

  if (payload.language === 'en') {
    return {
      subject: `${payload.visitorName} has arrived`,
      text: [
        `Hi ${payload.hostName},`,
        '',
        `${payload.visitorName} from ${payload.company} has checked in.`,
        `Time: ${checkInTime}`,
        '',
        'This message was sent automatically by Booker.',
      ].join('\n'),
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #0f172a;">
          <h2 style="margin: 0 0 16px;">Your visitor has arrived</h2>
          <p>Hi ${hostName},</p>
          <p><strong>${visitorName}</strong> from <strong>${company}</strong> has checked in.</p>
          <p><strong>Time:</strong> ${escapedCheckInTime}</p>
          <p style="margin-top: 24px; color: #64748b; font-size: 13px;">This message was sent automatically by Booker.</p>
        </div>
      `,
    };
  }

  return {
    subject: `${payload.visitorName} har anl\u00e4nt`,
    text: [
      `Hej ${payload.hostName},`,
      '',
      `${payload.visitorName} fr\u00e5n ${payload.company} har checkat in.`,
      `Tid: ${checkInTime}`,
      '',
      'Det h\u00e4r meddelandet skickades automatiskt av Booker.',
    ].join('\n'),
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #0f172a;">
        <h2 style="margin: 0 0 16px;">Din bes\u00f6kare har anl\u00e4nt</h2>
        <p>Hej ${hostName},</p>
        <p><strong>${visitorName}</strong> fr\u00e5n <strong>${company}</strong> har checkat in.</p>
        <p><strong>Tid:</strong> ${escapedCheckInTime}</p>
        <p style="margin-top: 24px; color: #64748b; font-size: 13px;">Det h\u00e4r meddelandet skickades automatiskt av Booker.</p>
      </div>
    `,
  };
};

const readBody = async (request: Request): Promise<JsonRecord> => {
  try {
    const body = await request.json();
    return isRecord(body) ? body : {};
  } catch {
    return {};
  }
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed.' }, 405);
  }

  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const fromEmail = Deno.env.get('NOTIFICATION_FROM_EMAIL');
    const replyToEmail = Deno.env.get('NOTIFICATION_REPLY_TO');

    if (!resendApiKey || !fromEmail) {
      return jsonResponse({
        status: 'not-configured',
        message: 'RESEND_API_KEY and NOTIFICATION_FROM_EMAIL must be configured.',
      }, 503);
    }

    const body = await readBody(request);
    const payload = requirePayload(body);
    const email = buildEmail(payload);

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [payload.hostEmail],
        subject: email.subject,
        text: email.text,
        html: email.html,
        ...(replyToEmail ? { reply_to: replyToEmail } : {}),
      }),
    });

    const resendData = await resendResponse.json().catch(() => null);

    if (!resendResponse.ok) {
      const errorMessage = isRecord(resendData) && typeof resendData.message === 'string'
        ? resendData.message
        : `Resend failed with status ${resendResponse.status}.`;

      return jsonResponse({
        status: 'failed',
        recipient: payload.hostEmail,
        message: errorMessage,
        error: errorMessage,
      }, 502);
    }

    return jsonResponse({
      status: 'sent',
      recipient: payload.hostEmail,
      sentAt: new Date().toISOString(),
      message: 'Host notification email sent.',
      providerId: isRecord(resendData) && typeof resendData.id === 'string' ? resendData.id : undefined,
    });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }

    return jsonResponse({
      status: 'failed',
      message: error instanceof Error ? error.message : 'Unexpected notification error.',
      error: error instanceof Error ? error.message : 'Unexpected notification error.',
    }, 500);
  }
});
