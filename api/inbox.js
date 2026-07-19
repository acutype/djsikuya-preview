const { createHash } = require('node:crypto');

const DEFAULT_TIMEOUT_MS = 2500;
const EMAIL_TIMEOUT_MS = 4000;
const MAX_BODY_BYTES = 32 * 1024;
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const DEFAULT_GIGOPS_PUBLIC_LEAD_URL = 'https://app.djsikuya.com/api/public/djsikuya-leads';
const NOTIFY_FROM = 'DJ Sikuya <bookings@djsikuya.com>';
const NOTIFY_TO = 'bookings@djsikuya.com';
const rateBuckets = new Map();

function sendJson(response, statusCode, body) {
  response.statusCode = statusCode;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.end(JSON.stringify(body));
}

async function readJson(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) {
      const error = new Error('Request is too large.');
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};
  return JSON.parse(raw);
}

function cleanText(value, maxLength = 2000) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
}

function validateLead(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return 'A valid booking enquiry is required.';
  }

  if (payload.type !== 'InboxItem') return 'A valid booking enquiry is required.';

  const honeypot = cleanText(payload.website && payload.website.honeypot, 200);
  if (honeypot) return 'Spam submission rejected.';

  const email = cleanText(payload.email, 254);
  const contact = cleanText(payload.contact || payload.phoneOrIg, 320);
  const reachableContact = contact.includes('@') || /\d/.test(contact);
  if (!isEmail(email) && !reachableContact) return 'A reachable contact is required.';

  const source = cleanText(payload.source, 200);
  if (!source.startsWith('djsikuya.com/')) return 'A valid booking source is required.';
  return null;
}

function requestHeader(request, name) {
  if (!request.headers) return '';
  if (typeof request.headers.get === 'function') return request.headers.get(name) || '';
  return request.headers[name] || request.headers[name.toLowerCase()] || '';
}

function isRateLimited(request) {
  const forwardedFor = cleanText(requestHeader(request, 'x-forwarded-for'), 500);
  if (!forwardedFor) return false;

  const clientAddress = forwardedFor.split(',')[0].trim();
  const key = createHash('sha256').update(clientAddress).digest('hex');
  const now = Date.now();
  const current = rateBuckets.get(key);
  if (!current || now - current.startedAt >= RATE_WINDOW_MS) {
    rateBuckets.set(key, { count: 1, startedAt: now });
    return false;
  }

  current.count += 1;
  if (rateBuckets.size > 5000) {
    for (const [bucketKey, bucket] of rateBuckets) {
      if (now - bucket.startedAt >= RATE_WINDOW_MS) rateBuckets.delete(bucketKey);
    }
  }
  return current.count > RATE_LIMIT;
}

function leadNotificationText(payload) {
  const fields = [
    ['source', payload.source],
    ['name', payload.name],
    ['email', payload.email],
    ['contact', payload.contact || payload.phoneOrIg],
    ['event date', payload.eventDate],
    ['venue', payload.venue],
    ['message', payload.message],
    ['submitted at', payload.submittedAt],
  ];
  const lines = fields.map(([label, value]) => `${label}: ${cleanText(value) || '-'}`);
  if (payload.attribution && typeof payload.attribution === 'object') {
    lines.push('', 'attribution:', JSON.stringify(payload.attribution, null, 2).slice(0, 4000));
  }
  return ['New booking enquiry from djsikuya.com', '', ...lines].join('\n');
}

async function sendEmailBackup(payload) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), EMAIL_TIMEOUT_MS);
  const email = cleanText(payload.email, 254);
  const body = {
    from: NOTIFY_FROM,
    to: [NOTIFY_TO],
    subject: 'New website booking enquiry',
    text: leadNotificationText(payload),
  };
  if (isEmail(email)) body.reply_to = email;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': `djsikuya-lead-${createHash('sha256')
          .update([
            cleanText(payload.source),
            cleanText(payload.email),
            cleanText(payload.contact || payload.phoneOrIg),
            cleanText(payload.eventDate),
            cleanText(payload.venue),
            cleanText(payload.message),
          ].join('|'))
          .digest('hex')}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

async function forwardToGigOps(endpoint, headers, payload) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const text = await response.text();
    return { response, text };
  } finally {
    clearTimeout(timer);
  }
}

module.exports = async function inboxProxy(request, response) {
  if (request.method === 'OPTIONS') {
    response.statusCode = 204;
    response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    response.end();
    return;
  }

  if (request.method !== 'POST') {
    sendJson(response, 405, { error: 'Method not allowed.' });
    return;
  }

  let payload;
  try {
    payload = await readJson(request);
  } catch (error) {
    sendJson(response, error.statusCode || 400, { error: error.statusCode ? error.message : 'Invalid JSON.' });
    return;
  }

  const validationError = validateLead(payload);
  if (validationError) {
    sendJson(response, 400, { error: validationError });
    return;
  }

  if (isRateLimited(request)) {
    sendJson(response, 429, { error: 'Too many booking attempts. Please email bookings@djsikuya.com.' });
    return;
  }

  const endpoint =
    process.env.GIGOPS_PUBLIC_LEAD_URL ||
    process.env.DJSIKUYA_PUBLIC_LEAD_ENDPOINT ||
    DEFAULT_GIGOPS_PUBLIC_LEAD_URL;
  if (!endpoint) {
    sendJson(response, 503, { error: 'Lead endpoint is not configured.' });
    return;
  }

  try {
    const headers = { 'Content-Type': 'application/json' };
    const secret = process.env.GIGOPS_PUBLIC_LEAD_SECRET || process.env.DJSIKUYA_LEAD_WEBHOOK_SECRET;
    if (secret) headers.Authorization = `Bearer ${secret}`;

    const { response: upstream, text } = await forwardToGigOps(endpoint, headers, payload);

    if (!upstream.ok && upstream.status >= 500) {
      if (await sendEmailBackup(payload)) {
        sendJson(response, 202, { ok: true, delivery: 'email-backup' });
      } else {
        sendJson(response, 503, { error: 'Lead service unavailable.' });
      }
      return;
    }

    response.statusCode = upstream.status;
    response.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json; charset=utf-8');
    response.end(text || JSON.stringify({ ok: upstream.ok }));
  } catch {
    if (await sendEmailBackup(payload)) {
      sendJson(response, 202, { ok: true, delivery: 'email-backup' });
    } else {
      sendJson(response, 503, { error: 'Lead service unavailable.' });
    }
  }
};
