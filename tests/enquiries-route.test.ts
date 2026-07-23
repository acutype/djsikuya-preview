import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { NextRequest } from "next/server.js";
import { POST } from "../app/api/enquiries/route.ts";

const originalFetch = global.fetch;
const originalPreviewMode = process.env.BOOKING_PREVIEW_MODE;
const originalGigOpsUrl = process.env.GIGOPS_PUBLIC_LEAD_URL;
const originalResendKey = process.env.RESEND_API_KEY;
const futureEventDate = new Date(Date.now() + 180 * 24 * 60 * 60 * 1_000)
  .toISOString()
  .slice(0, 10);

const validLead = {
  eventType: "Birthday",
  eventDate: futureEventDate,
  venue: "Test Venue",
  suburb: "Test Area",
  startTime: "19:00",
  finishTime: "23:00",
  estimatedGuests: "50 to 100",
  equipment: "Venue supplies equipment",
  music: ["R&B"],
  musicOther: "",
  name: "Test Lead",
  email: "lead@example.com",
  mobile: "0400000000",
  preferredContact: "email",
  budget: "$1,000 to $1,500",
  notes: "Route integration test",
  consent: true,
  website: "",
  submittedAt: "not-a-server-timestamp",
  attribution: {},
};

let requestSequence = 0;

function request(
  body: string | Record<string, unknown>,
  options: { origin?: string; contentLength?: string; forwardedFor?: string } = {},
) {
  requestSequence += 1;
  const headers = new Headers({
    "content-type": "application/json",
    origin: options.origin ?? "https://www.djsikuya.com",
    "x-forwarded-for": options.forwardedFor ?? `198.51.100.${requestSequence}`,
  });
  if (options.contentLength) headers.set("content-length", options.contentLength);
  return new NextRequest("https://www.djsikuya.com/api/enquiries", {
    method: "POST",
    headers,
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

afterEach(() => {
  global.fetch = originalFetch;
  if (originalPreviewMode === undefined) delete process.env.BOOKING_PREVIEW_MODE;
  else process.env.BOOKING_PREVIEW_MODE = originalPreviewMode;
  if (originalGigOpsUrl === undefined) delete process.env.GIGOPS_PUBLIC_LEAD_URL;
  else process.env.GIGOPS_PUBLIC_LEAD_URL = originalGigOpsUrl;
  if (originalResendKey === undefined) delete process.env.RESEND_API_KEY;
  else process.env.RESEND_API_KEY = originalResendKey;
});

test("rejects cross-origin and malformed requests without contacting providers", async () => {
  global.fetch = async () => {
    throw new Error("provider should not be called");
  };

  const crossOrigin = await POST(request(validLead, { origin: "https://example.com" }));
  assert.equal(crossOrigin.status, 403);

  const malformed = await POST(request("{not-json"));
  assert.equal(malformed.status, 400);
});

test("enforces the declared and actual 32 KiB request limits", async () => {
  const declared = await POST(request("{}", { contentLength: String(33 * 1_024) }));
  assert.equal(declared.status, 413);

  const oversizedBody = JSON.stringify({ notes: "x".repeat(33 * 1_024) });
  const actualRequest = request(oversizedBody);
  assert.equal(actualRequest.headers.has("content-length"), false);
  const actual = await POST(actualRequest);
  assert.equal(actual.status, 413);
});

test("silently accepts the honeypot without rate limiting or provider calls", async () => {
  global.fetch = async () => {
    throw new Error("provider should not be called");
  };
  delete process.env.BOOKING_PREVIEW_MODE;

  for (let attempt = 0; attempt < 7; attempt += 1) {
    const response = await POST(request(
      { website: "https://spam.example" },
      { forwardedFor: "203.0.113.200" },
    ));
    assert.equal(response.status, 201);
    assert.deepEqual(await response.json(), { ok: true, reference: "received" });
  }

  process.env.BOOKING_PREVIEW_MODE = "true";
  const validResponse = await POST(request(validLead, { forwardedFor: "203.0.113.200" }));
  assert.equal(validResponse.status, 201);
});

test("requires consent on the server", async () => {
  process.env.BOOKING_PREVIEW_MODE = "true";
  const response = await POST(request({ ...validLead, consent: false }));
  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /contact you about this enquiry/i);
});

test("preview mode validates the complete route without calling providers", async () => {
  process.env.BOOKING_PREVIEW_MODE = "true";
  global.fetch = async () => {
    throw new Error("provider should not be called");
  };
  const response = await POST(request(validLead));
  assert.equal(response.status, 201);
  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.preview, true);
});

test("maps a production request to the schema-safe GigOps contract", async () => {
  delete process.env.BOOKING_PREVIEW_MODE;
  process.env.GIGOPS_PUBLIC_LEAD_URL = "https://gigops.example/leads";
  let delivered: Record<string, unknown> | undefined;
  global.fetch = async (_url, init) => {
    delivered = JSON.parse(String(init?.body)) as Record<string, unknown>;
    return Response.json({ leadId: "lead_1" }, { status: 201 });
  };

  const response = await POST(request({
    ...validLead,
    venue: "V".repeat(180),
    suburb: "S".repeat(120),
  }));
  assert.equal(response.status, 201);
  assert.equal(delivered?.type, "InboxItem");
  assert.equal(delivered?.source, "djsikuya.com/book");
  assert.ok(String(delivered?.venue).length <= 180);
  assert.notEqual(delivered?.submittedAt, validLead.submittedAt);
  assert.match(String(delivered?.submittedAt), /^\d{4}-\d{2}-\d{2}T/);
  assert.deepEqual(
    {
      sourcePlatform: (delivered?.attribution as Record<string, unknown>).sourcePlatform,
      landingPath: (delivered?.attribution as Record<string, unknown>).landingPath,
    },
    { sourcePlatform: "direct", landingPath: "/book" },
  );
});

test("returns accepted when the fixed email backup preserves a lead", async () => {
  delete process.env.BOOKING_PREVIEW_MODE;
  process.env.GIGOPS_PUBLIC_LEAD_URL = "https://gigops.example/leads";
  process.env.RESEND_API_KEY = "resend-test-key";
  global.fetch = async (url) => {
    if (String(url).includes("gigops.example")) {
      return Response.json({ error: "offline" }, { status: 503 });
    }
    return Response.json({ id: "email_1" }, { status: 200 });
  };

  const response = await POST(request(validLead));
  assert.equal(response.status, 202);
  assert.equal((await response.json()).delivery, "email-backup");
});
