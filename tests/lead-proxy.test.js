const assert = require('node:assert/strict');
const { test, afterEach } = require('node:test');
const inboxProxy = require('../api/inbox');

function createResponse() {
  return {
    statusCode: 200,
    headers: {},
    body: '',
    setHeader(name, value) {
      this.headers[name] = value;
    },
    end(value = '') {
      this.body += value;
    },
  };
}

function createRequest(method, body, headers = {}) {
  return {
    method,
    headers,
    async *[Symbol.asyncIterator]() {
      if (body !== undefined) yield Buffer.from(JSON.stringify(body));
    },
  };
}

function createRawRequest(method, raw, headers = {}) {
  return {
    method,
    headers,
    async *[Symbol.asyncIterator]() {
      yield Buffer.from(raw);
    },
  };
}

afterEach(() => {
  delete process.env.GIGOPS_PUBLIC_LEAD_URL;
  delete process.env.GIGOPS_PUBLIC_LEAD_SECRET;
  delete process.env.RESEND_API_KEY;
  global.fetch = undefined;
});

test('rejects non-POST requests before contacting providers', async () => {
  let called = false;
  global.fetch = async () => {
    called = true;
  };

  const response = createResponse();
  await inboxProxy(createRequest('GET'), response);

  assert.equal(response.statusCode, 405);
  assert.equal(called, false);
});

test('rejects an invalid lead before contacting providers', async () => {
  let called = false;
  global.fetch = async () => {
    called = true;
  };

  const response = createResponse();
  await inboxProxy(createRequest('POST', {}), response);

  assert.equal(response.statusCode, 400);
  assert.equal(called, false);
  assert.deepEqual(JSON.parse(response.body), { error: 'A valid booking enquiry is required.' });
});

test('rejects malformed and oversized request bodies', async () => {
  const malformedResponse = createResponse();
  await inboxProxy(createRawRequest('POST', '{not-json'), malformedResponse);
  assert.equal(malformedResponse.statusCode, 400);
  assert.deepEqual(JSON.parse(malformedResponse.body), { error: 'Invalid JSON.' });

  const oversizedResponse = createResponse();
  await inboxProxy(createRawRequest('POST', 'x'.repeat(32 * 1024 + 1)), oversizedResponse);
  assert.equal(oversizedResponse.statusCode, 413);
  assert.deepEqual(JSON.parse(oversizedResponse.body), { error: 'Request is too large.' });
});

test('rejects a populated honeypot before contacting providers', async () => {
  let called = false;
  global.fetch = async () => {
    called = true;
  };

  const response = createResponse();
  await inboxProxy(createRequest('POST', {
    type: 'InboxItem',
    source: 'djsikuya.com/book',
    email: 'lead@example.com',
    website: { honeypot: 'https://spam.example' },
  }), response);

  assert.equal(response.statusCode, 400);
  assert.equal(called, false);
  assert.deepEqual(JSON.parse(response.body), { error: 'Spam submission rejected.' });
});

test('forwards a valid public lead to GigOps', async () => {
  process.env.GIGOPS_PUBLIC_LEAD_URL = 'https://example.test/leads';
  process.env.GIGOPS_PUBLIC_LEAD_SECRET = 'test-secret';
  let forwarded;
  global.fetch = async (url, options) => {
    forwarded = { url, options };
    return {
      ok: true,
      status: 201,
      headers: { get: () => 'application/json' },
      text: async () => JSON.stringify({ ok: true, leadId: 'lead_1' }),
    };
  };

  const payload = {
    type: 'InboxItem',
    source: 'djsikuya.com/book',
    name: 'Test Lead',
    email: 'lead@example.com',
  };
  const response = createResponse();
  await inboxProxy(createRequest('POST', payload), response);

  assert.equal(response.statusCode, 201);
  assert.equal(forwarded.url, 'https://example.test/leads');
  assert.equal(forwarded.options.headers.Authorization, 'Bearer test-secret');
  assert.deepEqual(JSON.parse(forwarded.options.body), payload);
});

test('uses the fixed Resend notification route when GigOps is unavailable', async () => {
  process.env.GIGOPS_PUBLIC_LEAD_URL = 'https://example.test/leads';
  process.env.RESEND_API_KEY = 'test-resend-key';
  const calls = [];
  global.fetch = async (url, options) => {
    calls.push({ url, options });
    if (url === 'https://example.test/leads') {
      return {
        ok: false,
        status: 503,
        headers: { get: () => 'application/json' },
        text: async () => JSON.stringify({ error: 'offline' }),
      };
    }
    return {
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      text: async () => JSON.stringify({ id: 'email_1' }),
    };
  };

  const response = createResponse();
  await inboxProxy(createRequest('POST', {
    type: 'InboxItem',
    source: 'djsikuya.com/book',
    name: 'Test Lead',
    email: 'lead@example.com',
    eventDate: '2026-08-20',
    venue: 'Test Room',
    message: 'Birthday booking',
  }), response);

  assert.equal(response.statusCode, 202);
  assert.equal(calls.length, 2);
  assert.equal(calls[1].url, 'https://api.resend.com/emails');
  assert.equal(calls[1].options.headers.Authorization, 'Bearer test-resend-key');
  assert.match(calls[1].options.headers['Idempotency-Key'], /^djsikuya-lead-[a-f0-9]{64}$/);
  const notification = JSON.parse(calls[1].options.body);
  assert.equal(notification.from, 'DJ Sikuya <bookings@djsikuya.com>');
  assert.deepEqual(notification.to, ['bookings@djsikuya.com']);
  assert.equal(notification.reply_to, 'lead@example.com');
  assert.match(notification.subject, /website booking enquiry/i);
  assert.match(notification.text, /Birthday booking/);
  assert.deepEqual(JSON.parse(response.body), { ok: true, delivery: 'email-backup' });
});

test('uses the email backup when the GigOps connection throws', async () => {
  process.env.GIGOPS_PUBLIC_LEAD_URL = 'https://example.test/leads';
  process.env.RESEND_API_KEY = 'test-resend-key';
  let calls = 0;
  global.fetch = async () => {
    calls += 1;
    if (calls === 1) throw new TypeError('connection failed');
    return { ok: true, status: 200 };
  };

  const response = createResponse();
  await inboxProxy(createRequest('POST', {
    type: 'InboxItem',
    source: 'djsikuya.com/book',
    email: 'lead@example.com',
  }), response);

  assert.equal(response.statusCode, 202);
  assert.equal(calls, 2);
});

test('uses the email backup when the GigOps response body stalls', async () => {
  process.env.GIGOPS_PUBLIC_LEAD_URL = 'https://example.test/leads';
  process.env.RESEND_API_KEY = 'test-resend-key';
  let calls = 0;
  global.fetch = async (_url, options) => {
    calls += 1;
    if (calls === 1) {
      return {
        ok: true,
        status: 201,
        headers: { get: () => 'application/json' },
        text: () => new Promise((resolve, reject) => {
          options.signal.addEventListener('abort', () => reject(new Error('body aborted')), { once: true });
        }),
      };
    }
    return { ok: true, status: 200 };
  };

  const response = createResponse();
  await inboxProxy(createRequest('POST', {
    type: 'InboxItem',
    source: 'djsikuya.com/book',
    email: 'lead@example.com',
  }), response);

  assert.equal(response.statusCode, 202);
  assert.equal(calls, 2);
});

test('rate limits repeated submissions from one forwarded client address', async () => {
  process.env.GIGOPS_PUBLIC_LEAD_URL = 'https://example.test/leads';
  global.fetch = async () => ({
    ok: true,
    status: 201,
    headers: { get: () => 'application/json' },
    text: async () => JSON.stringify({ ok: true }),
  });
  const payload = {
    type: 'InboxItem',
    source: 'djsikuya.com/book',
    email: 'lead@example.com',
  };

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const response = createResponse();
    await inboxProxy(createRequest('POST', payload, { 'x-forwarded-for': '203.0.113.42' }), response);
    assert.equal(response.statusCode, 201);
  }
  const limitedResponse = createResponse();
  await inboxProxy(createRequest('POST', payload, { 'x-forwarded-for': '203.0.113.42' }), limitedResponse);
  assert.equal(limitedResponse.statusCode, 429);
});

test('fails closed when Resend rejects the backup notification', async () => {
  process.env.GIGOPS_PUBLIC_LEAD_URL = 'https://example.test/leads';
  process.env.RESEND_API_KEY = 'test-resend-key';
  global.fetch = async (url) => ({
    ok: false,
    status: url === 'https://example.test/leads' ? 503 : 429,
    headers: { get: () => 'application/json' },
    text: async () => JSON.stringify({ error: 'unavailable' }),
  });

  const response = createResponse();
  await inboxProxy(createRequest('POST', {
    type: 'InboxItem',
    source: 'djsikuya.com/book',
    email: 'lead@example.com',
  }), response);

  assert.equal(response.statusCode, 503);
  assert.deepEqual(JSON.parse(response.body), { error: 'Lead service unavailable.' });
});

test('fails closed when GigOps and the email backup are both unavailable', async () => {
  process.env.GIGOPS_PUBLIC_LEAD_URL = 'https://example.test/leads';
  global.fetch = async () => ({
    ok: false,
    status: 503,
    headers: { get: () => 'application/json' },
    text: async () => JSON.stringify({ error: 'offline' }),
  });

  const response = createResponse();
  await inboxProxy(createRequest('POST', {
    type: 'InboxItem',
    source: 'djsikuya.com/booth-line',
    contact: '@testlead',
    name: 'Test Lead',
  }), response);

  assert.equal(response.statusCode, 503);
  assert.deepEqual(JSON.parse(response.body), { error: 'Lead service unavailable.' });
});
