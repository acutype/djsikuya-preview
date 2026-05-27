const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_GIGOPS_PUBLIC_LEAD_URL = 'https://app.djsikuya.com/api/public/djsikuya-leads';

function sendJson(response, statusCode, body) {
  response.statusCode = statusCode;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.end(JSON.stringify(body));
}

async function readJson(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};
  return JSON.parse(raw);
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

  const endpoint =
    process.env.GIGOPS_PUBLIC_LEAD_URL ||
    process.env.DJSIKUYA_PUBLIC_LEAD_ENDPOINT ||
    DEFAULT_GIGOPS_PUBLIC_LEAD_URL;
  if (!endpoint) {
    sendJson(response, 503, { error: 'Lead endpoint is not configured.' });
    return;
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
    const headers = { 'Content-Type': 'application/json' };
    const secret = process.env.GIGOPS_PUBLIC_LEAD_SECRET || process.env.DJSIKUYA_LEAD_WEBHOOK_SECRET;
    if (secret) headers.Authorization = `Bearer ${secret}`;

    const upstream = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(await readJson(request)),
      signal: controller.signal,
    });
    clearTimeout(timer);

    const text = await upstream.text();
    response.statusCode = upstream.status;
    response.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json; charset=utf-8');
    response.end(text || JSON.stringify({ ok: upstream.ok }));
  } catch (error) {
    sendJson(response, 502, {
      error: 'Lead proxy failed.',
      detail: error && error.name === 'AbortError' ? 'upstream timeout' : 'upstream unavailable',
    });
  }
};
