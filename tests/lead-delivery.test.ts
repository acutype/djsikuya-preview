import assert from "node:assert/strict";
import test from "node:test";
import {
  deliverLead,
  isLeadRateLimited,
  type PublicLead,
} from "../lib/lead-delivery.ts";

const lead: PublicLead = {
  type: "InboxItem",
  source: "djsikuya.com/book",
  name: "Test Lead",
  email: "lead@example.com",
  phoneOrIg: "0400000000",
  eventDate: "2026-09-12",
  venue: "Test venue, Test area",
  eventType: "Birthday",
  estimatedGuests: "50 to 100",
  message: "reference: SQ-TEST",
  submittedAt: "2026-07-23T00:00:00.000Z",
  website: { honeypot: "" },
  attribution: {
    sourcePlatform: "instagram",
    sourceCampaign: "",
    sourceMedium: "social",
    landingPath: "/book",
    sourceUrl: "",
    referrer: "",
    firstTouchAt: "",
    lastTouchAt: "",
  },
};

test("delivers the compatible InboxItem contract to GigOps", async () => {
  let request: { url: string; init?: RequestInit } | undefined;
  const result = await deliverLead(lead, {
    env: {
      GIGOPS_PUBLIC_LEAD_URL: "https://gigops.example/leads",
      GIGOPS_PUBLIC_LEAD_SECRET: "secret",
      GIGOPS_LEAD_ENDPOINT: "https://alternate.example/leads",
    },
    fetcher: async (url, init) => {
      request = { url: String(url), init };
      return Response.json({ leadId: "lead_1" }, { status: 201 });
    },
  });

  assert.deepEqual(result, { ok: true, delivery: "gigops", leadId: "lead_1" });
  assert.equal(request?.url, "https://gigops.example/leads");
  assert.equal((request?.init?.headers as Record<string, string>).Authorization, "Bearer secret");
  const delivered = JSON.parse(String(request?.init?.body));
  assert.equal(delivered.type, "InboxItem");
  assert.equal(delivered.source, "djsikuya.com/book");
});

test("uses the fixed Resend backup when GigOps is unavailable", async () => {
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  const result = await deliverLead(lead, {
    env: {
      GIGOPS_LEAD_ENDPOINT: "https://gigops.example/leads",
      RESEND_API_KEY: "resend-test-key",
    },
    fetcher: async (url, init) => {
      requests.push({ url: String(url), init });
      if (String(url).includes("gigops.example")) {
        return Response.json({ error: "offline" }, { status: 503 });
      }
      return Response.json({ id: "email_1" }, { status: 200 });
    },
  });

  assert.deepEqual(result, { ok: true, delivery: "email-backup" });
  assert.equal(requests.length, 2);
  assert.equal(requests[1].url, "https://api.resend.com/emails");
  const headers = requests[1].init?.headers as Record<string, string>;
  assert.equal(headers.Authorization, "Bearer resend-test-key");
  assert.match(headers["Idempotency-Key"], /^djsikuya-lead-[a-f0-9]{64}$/);
  const message = JSON.parse(String(requests[1].init?.body));
  assert.equal(message.from, "DJ Sikuya <bookings@djsikuya.com>");
  assert.deepEqual(message.to, ["bookings@djsikuya.com"]);
  assert.equal(message.reply_to, "lead@example.com");
  assert.equal(message.subject, "New website booking enquiry");
  assert.match(message.text, /SQ-TEST/);
});

test("deduplicates email retries when only the local reference changes", async () => {
  async function fallbackKey(payload: PublicLead) {
    let idempotencyKey = "";
    await deliverLead(payload, {
      env: {
        GIGOPS_PUBLIC_LEAD_URL: "https://gigops.example/leads",
        RESEND_API_KEY: "resend-test-key",
      },
      fetcher: async (url, init) => {
        if (String(url).includes("gigops.example")) {
          return Response.json({ error: "offline" }, { status: 503 });
        }
        idempotencyKey = (init?.headers as Record<string, string>)["Idempotency-Key"];
        return Response.json({ id: "email_1" }, { status: 200 });
      },
    });
    return idempotencyKey;
  }

  const first = await fallbackKey({ ...lead, message: "reference: SQ-FIRST\nstart time: 19:00" });
  const second = await fallbackKey({ ...lead, message: "reference: SQ-SECOND\nstart time: 19:00" });
  const changedGuests = await fallbackKey({
    ...lead,
    estimatedGuests: "100 to 150",
    message: "reference: SQ-THIRD\nstart time: 19:00",
  });
  assert.equal(first, second);
  assert.notEqual(first, changedGuests);
});

test("uses the email backup when a GigOps response body cannot be read", async () => {
  let callCount = 0;
  const result = await deliverLead(lead, {
    env: {
      GIGOPS_PUBLIC_LEAD_URL: "https://gigops.example/leads",
      RESEND_API_KEY: "resend-test-key",
    },
    fetcher: async () => {
      callCount += 1;
      if (callCount === 1) {
        return {
          ok: true,
          status: 201,
          text: async () => {
            throw new Error("body failed");
          },
        } as unknown as Response;
      }
      return Response.json({ id: "email_1" }, { status: 200 });
    },
  });

  assert.deepEqual(result, { ok: true, delivery: "email-backup" });
  assert.equal(callCount, 2);
});

test("does not create a side-channel lead for an upstream client error", async () => {
  const requests: string[] = [];
  const result = await deliverLead(lead, {
    env: {
      GIGOPS_PUBLIC_LEAD_URL: "https://gigops.example/leads",
      RESEND_API_KEY: "resend-test-key",
    },
    fetcher: async (url) => {
      requests.push(String(url));
      return Response.json({ error: "invalid" }, { status: 400 });
    },
  });

  assert.deepEqual(result, { ok: false, upstreamStatus: 400 });
  assert.deepEqual(requests, ["https://gigops.example/leads"]);
});

test("fails closed when the email backup is rejected", async () => {
  const result = await deliverLead(lead, {
    env: {
      GIGOPS_PUBLIC_LEAD_URL: "https://gigops.example/leads",
      RESEND_API_KEY: "resend-test-key",
    },
    fetcher: async (url) => Response.json(
      { error: "unavailable" },
      { status: String(url).includes("gigops.example") ? 503 : 429 },
    ),
  });
  assert.deepEqual(result, { ok: false });
});

test("fails closed when both delivery paths are unavailable", async () => {
  const result = await deliverLead(lead, {
    env: { GIGOPS_LEAD_ENDPOINT: "https://gigops.example/leads" },
    fetcher: async () => {
      throw new TypeError("connection failed");
    },
  });
  assert.deepEqual(result, { ok: false });
});

test("rate limits the sixth attempt from the same address", () => {
  const address = `203.0.113.${Math.floor(Math.random() * 100) + 1}`;
  const now = Date.now();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    assert.equal(isLeadRateLimited(address, now), false);
  }
  assert.equal(isLeadRateLimited(address, now), true);
});
