import { NextRequest, NextResponse } from "next/server";

function clean(value: unknown, max = 2400) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json({ error: "This plan must be sent from the Sikuya website." }, { status: 403 });
  }

  const input = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!input) return NextResponse.json({ error: "The event plan format was not valid." }, { status: 400 });
  const token = clean(input.token, 160);
  if (!/^[a-zA-Z0-9_-]{8,160}$/.test(token)) return NextResponse.json({ error: "The planning link is not valid." }, { status: 400 });
  if (!input.consent) return NextResponse.json({ error: "Confirm the event plan before sending." }, { status: 400 });

  const plan = {
    token,
    accessTime: clean(input.accessTime, 40),
    venueContact: clean(input.venueContact, 180),
    venuePhone: clean(input.venuePhone, 80),
    runSheet: clean(input.runSheet),
    keyMoments: clean(input.keyMoments),
    mustPlay: clean(input.mustPlay),
    doNotPlay: clean(input.doNotPlay),
    requests: clean(input.requests, 80),
    setupAccess: clean(input.setupAccess),
    parking: clean(input.parking),
    otherSuppliers: clean(input.otherSuppliers),
    finalNotes: clean(input.finalNotes),
  };

  if (!plan.accessTime || !plan.venueContact || !plan.venuePhone || !plan.runSheet || !plan.keyMoments || !plan.mustPlay) {
    return NextResponse.json({ error: "Complete the required planning details." }, { status: 400 });
  }

  if (process.env.BOOKING_PREVIEW_MODE === "true") {
    return NextResponse.json({ ok: true, preview: true }, { status: 201 });
  }

  const endpoint = process.env.GIGOPS_PLANNING_ENDPOINT?.trim();
  if (!endpoint) return NextResponse.json({ error: "Online event planning is temporarily unavailable." }, { status: 503 });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const secret = process.env.GIGOPS_LEAD_WEBHOOK_SECRET?.trim();
    if (secret) headers.Authorization = `Bearer ${secret}`;
    const response = await fetch(endpoint, { method: "POST", headers, body: JSON.stringify(plan), cache: "no-store", signal: controller.signal });
    if (!response.ok) return NextResponse.json({ error: "The booking system could not save the event plan." }, { status: 502 });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "The booking system did not respond." }, { status: 504 });
  } finally {
    clearTimeout(timeout);
  }
}
