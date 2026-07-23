import { createHash } from "node:crypto";

const DEFAULT_GIGOPS_PUBLIC_LEAD_URL = "https://app.djsikuya.com/api/public/djsikuya-leads";
const NOTIFY_FROM = "DJ Sikuya <bookings@djsikuya.com>";
const NOTIFY_TO = "bookings@djsikuya.com";
const GIGOPS_TIMEOUT_MS = 2_500;
const EMAIL_TIMEOUT_MS = 4_000;
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 10 * 60 * 1_000;

type Environment = Record<string, string | undefined>;
type Fetcher = typeof fetch;

export type PublicLead = {
  type: "InboxItem";
  source: "djsikuya.com/book";
  name: string;
  email: string;
  phoneOrIg: string;
  eventDate: string;
  venue: string;
  eventType: string;
  estimatedGuests: string;
  message: string;
  submittedAt: string;
  website: { honeypot: string };
  attribution: {
    sourcePlatform: string;
    sourceCampaign: string;
    sourceMedium: string;
    landingPath: string;
    sourceUrl: string;
    referrer: string;
    firstTouchAt: string;
    lastTouchAt: string;
  };
};

export type LeadDeliveryResult =
  | { ok: true; delivery: "gigops"; leadId?: string }
  | { ok: true; delivery: "email-backup" }
  | { ok: false; upstreamStatus?: number };

type DeliveryOptions = {
  env?: Environment;
  fetcher?: Fetcher;
};

type RateBucket = { count: number; startedAt: number };

const globalRateState = globalThis as typeof globalThis & {
  sikuyaLeadRateBuckets?: Map<string, RateBucket>;
};
const rateBuckets = globalRateState.sikuyaLeadRateBuckets ?? new Map<string, RateBucket>();
globalRateState.sikuyaLeadRateBuckets = rateBuckets;

function clean(value: unknown, max = 2_000) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function leadNotificationText(payload: PublicLead) {
  const fields = [
    ["source", payload.source],
    ["name", payload.name],
    ["email", payload.email],
    ["contact", payload.phoneOrIg],
    ["event type", payload.eventType],
    ["event date", payload.eventDate],
    ["venue", payload.venue],
    ["estimated guests", payload.estimatedGuests],
    ["message", payload.message],
    ["submitted at", payload.submittedAt],
  ];
  const lines = fields.map(([label, value]) => `${label}: ${clean(value) || "-"}`);
  lines.push("", "attribution:", JSON.stringify(payload.attribution, null, 2).slice(0, 4_000));
  return ["New booking enquiry from djsikuya.com", "", ...lines].join("\n");
}

async function fetchWithTimeout(
  fetcher: Fetcher,
  url: string,
  init: RequestInit,
  timeoutMs: number,
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetcher(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function gigOpsEndpoint(env: Environment) {
  return (
    env.GIGOPS_PUBLIC_LEAD_URL?.trim() ||
    env.DJSIKUYA_PUBLIC_LEAD_ENDPOINT?.trim() ||
    env.GIGOPS_LEAD_ENDPOINT?.trim() ||
    DEFAULT_GIGOPS_PUBLIC_LEAD_URL
  );
}

function gigOpsSecret(env: Environment) {
  return (
    env.GIGOPS_PUBLIC_LEAD_SECRET?.trim() ||
    env.DJSIKUYA_LEAD_WEBHOOK_SECRET?.trim() ||
    env.GIGOPS_LEAD_WEBHOOK_SECRET?.trim() ||
    ""
  );
}

async function forwardToGigOps(
  payload: PublicLead,
  env: Environment,
  fetcher: Fetcher,
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GIGOPS_TIMEOUT_MS);
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const secret = gigOpsSecret(env);
  if (secret) headers.Authorization = `Bearer ${secret}`;

  try {
    const response = await fetcher(gigOpsEndpoint(env), {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: controller.signal,
    });
    const body = await response.text();
    return { response, body };
  } finally {
    clearTimeout(timeout);
  }
}

async function sendEmailBackup(
  payload: PublicLead,
  env: Environment,
  fetcher: Fetcher,
) {
  const apiKey = env.RESEND_API_KEY?.trim();
  if (!apiKey) return false;

  const stableMessage = payload.message.replace(/^reference:.*(?:\r?\n|$)/im, "");
  const idempotencyKey = createHash("sha256")
    .update([
      payload.source,
      payload.name,
      payload.email,
      payload.phoneOrIg,
      payload.eventType,
      payload.eventDate,
      payload.venue,
      payload.estimatedGuests,
      stableMessage,
    ].join("|"))
    .digest("hex");

  try {
    const response = await fetchWithTimeout(
      fetcher,
      "https://api.resend.com/emails",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": `djsikuya-lead-${idempotencyKey}`,
        },
        body: JSON.stringify({
          from: NOTIFY_FROM,
          to: [NOTIFY_TO],
          reply_to: payload.email,
          subject: "New website booking enquiry",
          text: leadNotificationText(payload),
        }),
      },
      EMAIL_TIMEOUT_MS,
    );
    return response.ok;
  } catch {
    return false;
  }
}

export async function deliverLead(
  payload: PublicLead,
  options: DeliveryOptions = {},
): Promise<LeadDeliveryResult> {
  const env = options.env ?? process.env;
  const fetcher = options.fetcher ?? fetch;

  try {
    const { response: upstream, body } = await forwardToGigOps(payload, env, fetcher);

    if (upstream.ok) {
      let responsePayload: { leadId?: unknown } = {};
      try {
        responsePayload = JSON.parse(body) as { leadId?: unknown };
      } catch {
        // A successful empty or non-JSON response still means GigOps accepted the lead.
      }
      return {
        ok: true,
        delivery: "gigops",
        leadId: typeof responsePayload.leadId === "string" ? responsePayload.leadId : undefined,
      };
    }
    if (upstream.status < 500) {
      return { ok: false, upstreamStatus: upstream.status };
    }
  } catch {
    // The fixed email route below preserves the lead when GigOps is unreachable.
  }

  if (await sendEmailBackup(payload, env, fetcher)) {
    return { ok: true, delivery: "email-backup" };
  }
  return { ok: false };
}

export function isLeadRateLimited(forwardedFor: string, now = Date.now()) {
  const clientAddress = clean(forwardedFor.split(",")[0], 200);
  if (!clientAddress) return false;

  const key = createHash("sha256").update(clientAddress).digest("hex");
  const current = rateBuckets.get(key);
  if (!current || now - current.startedAt >= RATE_WINDOW_MS) {
    rateBuckets.set(key, { count: 1, startedAt: now });
    return false;
  }

  current.count += 1;
  if (rateBuckets.size > 5_000) {
    for (const [bucketKey, bucket] of rateBuckets) {
      if (now - bucket.startedAt >= RATE_WINDOW_MS) rateBuckets.delete(bucketKey);
    }
  }
  return current.count > RATE_LIMIT;
}
