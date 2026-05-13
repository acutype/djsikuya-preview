import { NextResponse } from "next/server";
import { Resend } from "resend";
import { z } from "zod";

const bookingSchema = z.object({
  name: z.string().trim().min(2).max(120),
  contact: z.string().trim().min(3).max(160),
  eventDate: z.string().trim().min(1).max(40),
  venue: z.string().trim().max(160).optional().default(""),
  hours: z.string().trim().max(20).optional().default(""),
  budget: z.string().trim().min(1).max(80),
  message: z.string().trim().min(10).max(2400),
});

function bookingText(booking: z.infer<typeof bookingSchema>) {
  return [
    "New DJ Sikuya booking request",
    "",
    `Name: ${booking.name}`,
    `Contact: ${booking.contact}`,
    `Event date: ${booking.eventDate}`,
    `Venue: ${booking.venue || "not supplied"}`,
    `Hours: ${booking.hours || "not supplied"}`,
    `Budget: ${booking.budget}`,
    "",
    "Message:",
    booking.message,
  ].join("\n");
}

export async function POST(request: Request) {
  const parsed = bookingSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please fill in the required booking details." },
      { status: 400 },
    );
  }

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.BOOKING_TO_EMAIL ?? "bookings@djsikuya.com";
  const from = process.env.BOOKING_FROM_EMAIL ?? "DJ Sikuya <bookings@djsikuya.com>";

  if (!apiKey) {
    return NextResponse.json({ delivered: false, reason: "email_not_configured" });
  }

  const resend = new Resend(apiKey);
  const booking = parsed.data;

  try {
    await resend.emails.send({
      from,
      to,
      replyTo: booking.contact.includes("@") ? booking.contact : undefined,
      subject: `Booking request: ${booking.name} - ${booking.eventDate}`,
      text: bookingText(booking),
    });

    return NextResponse.json({ delivered: true });
  } catch {
    return NextResponse.json(
      { error: "Booking email could not be sent. Please email bookings@djsikuya.com directly." },
      { status: 502 },
    );
  }
}
