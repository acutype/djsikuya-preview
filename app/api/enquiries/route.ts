import { NextRequest, NextResponse } from "next/server.js";
import {
  deliverLead,
  isLeadRateLimited,
  type PublicLead,
} from "../../../lib/lead-delivery.ts";

const MAX_TEXT = 2400;
const MAX_BODY_BYTES = 32 * 1024;
const EVENT_TYPES = new Set(["Birthday", "Private party", "Wedding", "Venue night", "Corporate event", "Community event", "Other celebration"]);
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const runtime = "nodejs";
export const maxDuration = 10;

function clean(value: unknown, max = 240) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function asList(value: unknown) {
  return Array.isArray(value) ? value.map((item) => clean(item, 80)).filter(Boolean).slice(0, 12) : [];
}

function sameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  return !origin || origin === request.nextUrl.origin;
}

function reference() {
  return `SQ-${Date.now().toString(36).toUpperCase()}`;
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "This enquiry must be sent from the Sikuya website." }, { status: 403 });
  }

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "The enquiry is too large." }, { status: 413 });
  }

  let input: Record<string, unknown>;
  try {
    const raw = await request.text();
    if (Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "The enquiry is too large." }, { status: 413 });
    }
    input = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "The enquiry format was not valid." }, { status: 400 });
  }

  if (clean(input.website, 200)) {
    return NextResponse.json({ ok: true, reference: "received" }, { status: 201 });
  }

  const name = clean(input.name, 140);
  const email = clean(input.email, 180).toLowerCase();
  const mobile = clean(input.mobile, 80);
  const eventType = clean(input.eventType, 120);
  const eventDate = clean(input.eventDate, 20);
  const venue = clean(input.venue, 180);
  const suburb = clean(input.suburb, 120);
  const startTime = clean(input.startTime, 20);
  const finishTime = clean(input.finishTime, 20);
  const estimatedGuests = clean(input.estimatedGuests, 80);
  const equipment = clean(input.equipment, 180);
  const music = asList(input.music);
  const musicOther = clean(input.musicOther, 240);
  const preferredContact = clean(input.preferredContact, 40);
  const budget = clean(input.budget, 80);
  const notes = clean(input.notes, 1200);
  const attribution = typeof input.attribution === "object" && input.attribution ? input.attribution as Record<string, unknown> : {};

  const errors: string[] = [];
  if (!name) errors.push("Name is required.");
  if (!/^\S+@\S+\.\S+$/.test(email)) errors.push("A working email is required.");
  if (mobile.replace(/\D/g, "").length < 8) errors.push("A working mobile number is required.");
  if (!EVENT_TYPES.has(eventType)) errors.push("Choose a valid event type.");
  if (!DATE_PATTERN.test(eventDate) || Number.isNaN(Date.parse(`${eventDate}T00:00:00Z`)) || eventDate < new Date().toISOString().slice(0, 10)) errors.push("Choose a valid future event date.");
  if (!TIME_PATTERN.test(startTime) || !TIME_PATTERN.test(finishTime)) errors.push("Choose valid start and finish times.");
  if (!venue || !suburb) errors.push("Complete the venue and area.");
  if (!estimatedGuests || !equipment || (!music.length && !musicOther) || !budget) errors.push("Complete the room and budget details.");
  if (input.consent !== true) errors.push("Confirm that Sikuya may contact you about this enquiry.");

  if (errors.length) {
    return NextResponse.json({ error: errors.join(" ") }, { status: 400 });
  }

  if (isLeadRateLimited(request.headers.get("x-forwarded-for") || "")) {
    return NextResponse.json(
      { error: "Too many booking attempts. Please email bookings@djsikuya.com." },
      { status: 429 },
    );
  }

  const enquiryReference = reference();
  if (process.env.BOOKING_PREVIEW_MODE === "true") {
    return NextResponse.json({ ok: true, preview: true, reference: enquiryReference }, { status: 201 });
  }

  const message = [
    `reference: ${enquiryReference}`,
    `start time: ${startTime}`,
    `finish time: ${finishTime}`,
    `suburb / area: ${suburb}`,
    `equipment: ${equipment}`,
    `music direction: ${[...music, musicOther].filter(Boolean).join(", ")}`,
    `preferred contact: ${preferredContact}`,
    `budget range: ${budget}`,
    `additional notes: ${notes || "-"}`,
  ].join("\n").slice(0, MAX_TEXT);

  const upstreamPayload: PublicLead = {
    type: "InboxItem",
    source: "djsikuya.com/book",
    name,
    email,
    phoneOrIg: mobile,
    eventDate,
    venue: `${venue}, ${suburb}`.slice(0, 180),
    eventType,
    estimatedGuests,
    message,
    submittedAt: new Date().toISOString(),
    website: { honeypot: "" },
    attribution: {
      sourcePlatform: clean(attribution.sourcePlatform, 80) || "direct",
      sourceCampaign: clean(attribution.sourceCampaign, 120),
      sourceMedium: clean(attribution.sourceMedium, 80),
      landingPath: clean(attribution.landingPath, 300) || "/book",
      sourceUrl: clean(attribution.sourceUrl, 500),
      referrer: clean(attribution.referrer, 500),
      firstTouchAt: clean(attribution.firstTouchAt, 80),
      lastTouchAt: clean(attribution.lastTouchAt, 80),
    },
  };

  const delivery = await deliverLead(upstreamPayload);
  if (delivery.ok) {
    return NextResponse.json(
      {
        ok: true,
        reference: enquiryReference,
        leadId: delivery.delivery === "gigops" ? delivery.leadId : undefined,
        delivery: delivery.delivery,
      },
      { status: delivery.delivery === "email-backup" ? 202 : 201 },
    );
  }
  return NextResponse.json(
    { error: "The booking system could not accept the enquiry. Please email bookings@djsikuya.com." },
    { status: delivery.upstreamStatus ?? 503 },
  );
}
