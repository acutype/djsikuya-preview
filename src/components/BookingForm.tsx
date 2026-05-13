"use client";

import { FormEvent, useMemo, useState } from "react";
import { bookingEmail } from "@/lib/site";

type SubmitState = "idle" | "sending" | "sent" | "fallback" | "error";

const budgetRanges = [
  "under $500",
  "$500 - $900",
  "$900 - $1,500",
  "$1,500+",
  "not sure yet",
];

export function BookingForm() {
  const [state, setState] = useState<SubmitState>("idle");
  const [error, setError] = useState("");
  const [formSnapshot, setFormSnapshot] = useState<Record<string, FormDataEntryValue>>({});

  const mailtoHref = useMemo(() => {
    const subject = encodeURIComponent("DJ Sikuya booking request");
    const body = encodeURIComponent(
      [
        `Name: ${formSnapshot.name ?? ""}`,
        `Contact: ${formSnapshot.contact ?? ""}`,
        `Event date: ${formSnapshot.eventDate ?? ""}`,
        `Venue: ${formSnapshot.venue ?? ""}`,
        `Hours: ${formSnapshot.hours ?? ""}`,
        `Budget: ${formSnapshot.budget ?? ""}`,
        "",
        `${formSnapshot.message ?? ""}`,
      ].join("\n"),
    );
    return `mailto:${bookingEmail}?subject=${subject}&body=${body}`;
  }, [formSnapshot]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("sending");
    setError("");

    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(formData.entries());
    setFormSnapshot(payload);

    const response = await fetch("/api/book", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      const data = (await response.json()) as { delivered?: boolean };
      setState(data.delivered ? "sent" : "fallback");
      if (data.delivered) event.currentTarget.reset();
      return;
    }

    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    setError(data?.error ?? "Something went wrong. Email bookings@djsikuya.com directly.");
    setState("error");
  }

  return (
    <form className="grid gap-5" onSubmit={onSubmit}>
      <div className="grid gap-5 md:grid-cols-2">
        <label className="field-label">
          name
          <input className="field-input" name="name" required />
        </label>
        <label className="field-label">
          contact
          <input className="field-input" name="contact" placeholder="email or phone" required />
        </label>
        <label className="field-label">
          event date
          <input className="field-input" name="eventDate" type="date" required />
        </label>
        <label className="field-label">
          venue
          <input className="field-input" name="venue" placeholder="venue or suburb" />
        </label>
        <label className="field-label">
          hours
          <input className="field-input" min="1" name="hours" placeholder="4" type="number" />
        </label>
        <label className="field-label">
          budget range
          <select className="field-input" name="budget" required>
            {budgetRanges.map((range) => (
              <option key={range}>{range}</option>
            ))}
          </select>
        </label>
      </div>
      <label className="field-label">
        message
        <textarea
          className="field-input min-h-36 resize-y"
          name="message"
          placeholder="tell me the room, the crowd, the timing and the feeling you want"
          required
        />
      </label>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <button className="button-primary" disabled={state === "sending"} type="submit">
          {state === "sending" ? "sending..." : "send booking request"}
        </button>
        {state === "sent" && <p className="text-sm text-gold-200">sent to {bookingEmail}</p>}
        {state === "fallback" && (
          <a className="text-sm text-gold-200 underline underline-offset-4" href={mailtoHref}>
            finish by email
          </a>
        )}
        {state === "error" && <p className="text-sm text-red-200">{error}</p>}
      </div>
    </form>
  );
}
