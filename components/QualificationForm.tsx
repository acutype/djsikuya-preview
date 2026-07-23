"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type FormDataShape = {
  eventType: string;
  eventDate: string;
  venue: string;
  suburb: string;
  startTime: string;
  finishTime: string;
  estimatedGuests: string;
  equipment: string;
  music: string[];
  musicOther: string;
  name: string;
  email: string;
  mobile: string;
  preferredContact: string;
  budget: string;
  notes: string;
  consent: boolean;
  website: string;
};

type Attribution = {
  sourcePlatform: string;
  sourceCampaign: string;
  sourceMedium: string;
  landingPath: string;
  sourceUrl: string;
  referrer: string;
  firstTouchAt: string;
  lastTouchAt: string;
};

const initialForm: FormDataShape = {
  eventType: "",
  eventDate: "",
  venue: "",
  suburb: "",
  startTime: "",
  finishTime: "",
  estimatedGuests: "",
  equipment: "",
  music: [],
  musicOther: "",
  name: "",
  email: "",
  mobile: "",
  preferredContact: "email",
  budget: "",
  notes: "",
  consent: false,
  website: "",
};

const stepTitles = ["The event", "The room", "Your details", "Review"];
const eventTypes = ["Birthday", "Private party", "Wedding", "Venue night", "Corporate event", "Community event", "Other celebration"];
const musicOptions = ["R&B", "Afrobeats", "Hip hop", "OPM", "House", "Pop", "Party classics", "Open to suggestions"];

type TransitionDocument = Document & {
  startViewTransition?: (update: () => void) => void;
};

function today() {
  const value = new Date();
  value.setMinutes(value.getMinutes() - value.getTimezoneOffset());
  return value.toISOString().slice(0, 10);
}

function FieldError({ message, field }: { message?: string; field: string }) {
  return message ? <span className="field-error" id={`${field}-error`}>{message}</span> : null;
}

export default function QualificationForm() {
  const [step, setStep] = useState(0);
  const [furthestStep, setFurthestStep] = useState(0);
  const [form, setForm] = useState<FormDataShape>(initialForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ reference: string; preview: boolean } | null>(null);
  const [submitError, setSubmitError] = useState("");
  const errorSummaryRef = useRef<HTMLDivElement>(null);
  const firstStepRender = useRef(true);
  const [attribution, setAttribution] = useState<Attribution>({
    sourcePlatform: "direct",
    sourceCampaign: "",
    sourceMedium: "",
    landingPath: "/book",
    sourceUrl: "https://djsikuya.com/book",
    referrer: "direct",
    firstTouchAt: "",
    lastTouchAt: "",
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const now = new Date().toISOString();
    const source = params.get("utm_source") || params.get("source") || params.get("ref") || "direct";
    const rawEventType = params.get("eventType") || "";
    const rawEventDate = params.get("eventDate") || "";
    const rawStartTime = params.get("startTime") || "";
    const rawFinishTime = params.get("finishTime") || "";
    const quickEventType = eventTypes.includes(rawEventType) ? rawEventType : "";
    const quickEventDate = /^\d{4}-\d{2}-\d{2}$/.test(rawEventDate) && rawEventDate >= today() && !Number.isNaN(Date.parse(`${rawEventDate}T00:00:00Z`)) ? rawEventDate : "";
    const quickStartTime = /^([01]\d|2[0-3]):[0-5]\d$/.test(rawStartTime) ? rawStartTime : "";
    const quickFinishTime = /^([01]\d|2[0-3]):[0-5]\d$/.test(rawFinishTime) ? rawFinishTime : "";
    if (quickEventType || quickEventDate || quickStartTime || quickFinishTime) {
      setForm((current) => ({
        ...current,
        eventType: quickEventType,
        eventDate: quickEventDate,
        startTime: quickStartTime,
        finishTime: quickFinishTime,
      }));
    }
    setAttribution({
      sourcePlatform: source,
      sourceCampaign: params.get("utm_campaign") || "",
      sourceMedium: params.get("utm_medium") || "",
      landingPath: `${window.location.pathname}${window.location.search}`,
      sourceUrl: window.location.href,
      referrer: document.referrer || "direct",
      firstTouchAt: now,
      lastTouchAt: now,
    });
  }, []);

  const review = useMemo(
    () => [
      { label: "Event", value: form.eventType, step: 0 },
      { label: "Date", value: form.eventDate, step: 0 },
      { label: "Time", value: `${form.startTime} to ${form.finishTime}`, step: 0 },
      { label: "Venue", value: `${form.venue}, ${form.suburb}`, step: 0 },
      { label: "Guests", value: form.estimatedGuests, step: 1 },
      { label: "Equipment", value: form.equipment, step: 1 },
      { label: "Music", value: [...form.music, form.musicOther].filter(Boolean).join(", "), step: 1 },
      { label: "Contact", value: `${form.name} · ${form.mobile} · ${form.email}`, step: 2 },
      { label: "Preferred contact", value: form.preferredContact, step: 2 },
      { label: "Budget", value: form.budget, step: 2 },
    ],
    [form]
  );

  useEffect(() => {
    document.title = `Step ${step + 1} of 4: ${stepTitles[step]} | Sikuya`;
    if (firstStepRender.current) {
      firstStepRender.current = false;
      return;
    }
    window.requestAnimationFrame(() => {
      const heading = document.getElementById(["event-step", "room-step", "contact-step", "review-step"][step]);
      heading?.focus({ preventScroll: true });
      heading?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
        block: "start",
      });
    });
  }, [step]);

  function update<K extends keyof FormDataShape>(field: K, value: FormDataShape[K]) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function toggleMusic(value: string) {
    update(
      "music",
      form.music.includes(value) ? form.music.filter((item) => item !== value) : [...form.music, value]
    );
  }

  function validate(currentStep: number) {
    const next: Record<string, string> = {};
    if (currentStep === 0) {
      if (!form.eventType) next.eventType = "Choose the kind of event.";
      if (!form.eventDate) next.eventDate = "Choose the event date.";
      if (form.eventDate && form.eventDate < today()) next.eventDate = "Choose a future date.";
      if (!form.venue.trim()) next.venue = "Enter the venue or location.";
      if (!form.suburb.trim()) next.suburb = "Enter the suburb or area.";
      if (!form.startTime) next.startTime = "Choose a start time.";
      if (!form.finishTime) next.finishTime = "Choose a finish time.";
    }
    if (currentStep === 1) {
      if (!form.estimatedGuests) next.estimatedGuests = "Choose an estimated guest range.";
      if (!form.equipment) next.equipment = "Tell us what the venue is providing.";
      if (form.music.length === 0 && !form.musicOther.trim()) next.music = "Choose at least one music direction.";
    }
    if (currentStep === 2) {
      if (!form.name.trim()) next.name = "Enter your name.";
      if (!/^\S+@\S+\.\S+$/.test(form.email)) next.email = "Enter a working email address.";
      if (form.mobile.replace(/\D/g, "").length < 8) next.mobile = "Enter a working mobile number.";
      if (!form.budget) next.budget = "Choose the closest budget range.";
    }
    if (currentStep === 3 && !form.consent) next.consent = "Confirm that Sikuya may contact you about this enquiry.";
    setErrors(next);
    if (Object.keys(next).length) {
      window.requestAnimationFrame(() => errorSummaryRef.current?.focus());
    }
    return Object.keys(next).length === 0;
  }

  function moveToStep(nextStep: number) {
    const destination = Math.max(0, Math.min(3, nextStep));
    const updateStep = () => setStep(destination);
    const transitionDocument = document as TransitionDocument;
    if (
      transitionDocument.startViewTransition &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      transitionDocument.startViewTransition(updateStep);
    } else {
      updateStep();
    }
  }

  function nextStep() {
    if (!validate(step)) return;
    const destination = Math.min(3, step + 1);
    setFurthestStep((current) => Math.max(current, destination));
    moveToStep(destination);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validate(3)) return;
    setSubmitting(true);
    setSubmitError("");

    try {
      const response = await fetch("/api/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, attribution, submittedAt: new Date().toISOString() }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "The enquiry could not be sent.");
      setResult({ reference: payload.reference || "received", preview: Boolean(payload.preview) });
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "The enquiry could not be sent.");
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <section className="success-panel" aria-live="polite">
        <p className="eyebrow">Enquiry received</p>
        <h2>{result.preview ? "Preview complete." : "Your enquiry is in review."}</h2>
        {result.preview ? (
          <p className="preview-notice">Preview only. No enquiry or personal details were sent.</p>
        ) : (
          <p>
            Your reference is {result.reference}. This is an enquiry, not a confirmed booking. You
            will receive the quote and next step after the details are reviewed.
          </p>
        )}
        <Link className="primary-cta" href="/">
          Return home
        </Link>
      </section>
    );
  }

  return (
    <form className="guided-form" onSubmit={submit} noValidate>
      <nav className="form-progress" aria-label="Booking enquiry progress">
        <ol>
          {stepTitles.map((title, index) => (
            <li className={index < step ? "is-complete" : index === step ? "is-current" : ""} key={title}>
              <button
                type="button"
                onClick={() => moveToStep(index)}
                disabled={index > furthestStep}
                aria-current={index === step ? "step" : undefined}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{title}</strong>
              </button>
            </li>
          ))}
        </ol>
      </nav>
      <div className="form-step-label">
        <span>Step {step + 1} of 4</span>
        <span>{stepTitles[step]}</span>
      </div>

      {Object.keys(errors).length ? (
        <div className="error-summary" role="alert" tabIndex={-1} ref={errorSummaryRef}>
          <strong>{Object.keys(errors).length} {Object.keys(errors).length === 1 ? "detail needs" : "details need"} attention.</strong>
          <p>Check the highlighted fields before continuing.</p>
        </div>
      ) : null}

      {step === 0 ? (
        <section className="form-stage" aria-labelledby="event-step">
          <h2 id="event-step" tabIndex={-1}>Start with the practical details.</h2>
          <p className="form-support">Share the essentials so I can review the date, understand the event and prepare an accurate quote.</p>
          <div className="field-grid">
            <div className="form-field">
              <label htmlFor="eventType">Event type</label>
              <select id="eventType" value={form.eventType} onChange={(e) => update("eventType", e.target.value)} aria-invalid={Boolean(errors.eventType)} aria-describedby={errors.eventType ? "eventType-error" : undefined}>
                <option value="">Choose one</option>
                {eventTypes.map((eventType) => <option key={eventType}>{eventType}</option>)}
              </select>
              <FieldError field="eventType" message={errors.eventType} />
            </div>
            <div className="form-field">
              <label htmlFor="eventDate">Event date</label>
              <input id="eventDate" type="date" min={today()} value={form.eventDate} onChange={(e) => update("eventDate", e.target.value)} aria-invalid={Boolean(errors.eventDate)} aria-describedby={errors.eventDate ? "eventDate-error" : undefined} />
              <FieldError field="eventDate" message={errors.eventDate} />
            </div>
            <div className="form-field">
              <label htmlFor="venue">Venue or location</label>
              <input id="venue" autoComplete="organization" enterKeyHint="next" value={form.venue} onChange={(e) => update("venue", e.target.value)} placeholder="The venue name" aria-invalid={Boolean(errors.venue)} aria-describedby={errors.venue ? "venue-error" : undefined} />
              <FieldError field="venue" message={errors.venue} />
            </div>
            <div className="form-field">
              <label htmlFor="suburb">Suburb or area</label>
              <input id="suburb" autoComplete="address-level2" enterKeyHint="next" value={form.suburb} onChange={(e) => update("suburb", e.target.value)} placeholder="Suburb or area" aria-invalid={Boolean(errors.suburb)} aria-describedby={errors.suburb ? "suburb-error" : undefined} />
              <FieldError field="suburb" message={errors.suburb} />
            </div>
            <div className="form-field">
              <label htmlFor="startTime">Music starts</label>
              <input id="startTime" type="time" value={form.startTime} onChange={(e) => update("startTime", e.target.value)} aria-invalid={Boolean(errors.startTime)} aria-describedby={errors.startTime ? "startTime-error" : undefined} />
              <FieldError field="startTime" message={errors.startTime} />
            </div>
            <div className="form-field">
              <label htmlFor="finishTime">Music finishes</label>
              <input id="finishTime" type="time" value={form.finishTime} onChange={(e) => update("finishTime", e.target.value)} aria-invalid={Boolean(errors.finishTime)} aria-describedby={errors.finishTime ? "finishTime-error" : undefined} />
              <FieldError field="finishTime" message={errors.finishTime} />
            </div>
          </div>
        </section>
      ) : null}

      {step === 1 ? (
        <section className="form-stage" aria-labelledby="room-step">
          <h2 id="room-step" tabIndex={-1}>What will the room need?</h2>
          <p className="form-support">A quick picture of the crowd, sound setup and music direction. The detailed plan comes after confirmation.</p>
          <div className="field-grid">
            <div className="form-field">
              <label htmlFor="estimatedGuests">Estimated guests</label>
              <select id="estimatedGuests" value={form.estimatedGuests} onChange={(e) => update("estimatedGuests", e.target.value)} aria-invalid={Boolean(errors.estimatedGuests)} aria-describedby={errors.estimatedGuests ? "estimatedGuests-error" : undefined}>
                <option value="">Choose a range</option>
                <option>Under 50</option>
                <option>50 to 100</option>
                <option>100 to 200</option>
                <option>200 to 400</option>
                <option>More than 400</option>
              </select>
              <FieldError field="estimatedGuests" message={errors.estimatedGuests} />
            </div>
            <div className="form-field">
              <label htmlFor="equipment">DJ equipment and sound</label>
              <select id="equipment" value={form.equipment} onChange={(e) => update("equipment", e.target.value)} aria-invalid={Boolean(errors.equipment)} aria-describedby={errors.equipment ? "equipment-error" : undefined}>
                <option value="">Choose one</option>
                <option>Venue provides decks and sound</option>
                <option>Venue provides sound only</option>
                <option>Full DJ setup is needed</option>
                <option>Not sure yet</option>
              </select>
              <FieldError field="equipment" message={errors.equipment} />
            </div>
            <fieldset className="field-full" style={{ border: 0, padding: 0, margin: 0 }} aria-describedby={errors.music ? "music-error" : undefined}>
              <legend className="fieldset-label">Music direction</legend>
              <div className="choice-grid">
                {musicOptions.map((option) => {
                  const id = `music-${option.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
                  return (
                    <div className="choice" key={option}>
                      <input id={id} type="checkbox" checked={form.music.includes(option)} onChange={() => toggleMusic(option)} />
                      <label htmlFor={id}>{option}</label>
                    </div>
                  );
                })}
              </div>
              <FieldError field="music" message={errors.music} />
            </fieldset>
            <div className="form-field field-full">
              <label htmlFor="musicOther">Anything else about the music?</label>
              <input id="musicOther" value={form.musicOther} onChange={(e) => update("musicOther", e.target.value)} placeholder="A mixed crowd, plenty of 2000s R&B and a strong finish" />
            </div>
          </div>
        </section>
      ) : null}

      {step === 2 ? (
        <section className="form-stage" aria-labelledby="contact-step">
          <h2 id="contact-step" tabIndex={-1}>Where should the quote go?</h2>
          <p className="form-support">A working email and mobile number are required so the enquiry never stalls over missing contact details.</p>
          <div className="field-grid">
            <div className="form-field">
              <label htmlFor="name">Your name</label>
              <input id="name" autoComplete="name" enterKeyHint="next" value={form.name} onChange={(e) => update("name", e.target.value)} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? "name-error" : undefined} />
              <FieldError field="name" message={errors.name} />
            </div>
            <div className="form-field">
              <label htmlFor="mobile">Mobile number</label>
              <input id="mobile" type="tel" inputMode="tel" autoComplete="tel" enterKeyHint="next" value={form.mobile} onChange={(e) => update("mobile", e.target.value)} placeholder="Your mobile number" aria-invalid={Boolean(errors.mobile)} aria-describedby={errors.mobile ? "mobile-error" : undefined} />
              <FieldError field="mobile" message={errors.mobile} />
            </div>
            <div className="form-field">
              <label htmlFor="email">Email</label>
              <input id="email" type="email" inputMode="email" autoComplete="email" enterKeyHint="next" value={form.email} onChange={(e) => update("email", e.target.value)} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "email-error" : undefined} />
              <FieldError field="email" message={errors.email} />
            </div>
            <div className="form-field">
              <label htmlFor="preferredContact">Preferred contact</label>
              <select id="preferredContact" value={form.preferredContact} onChange={(e) => update("preferredContact", e.target.value)}>
                <option value="email">Email</option>
                <option value="phone">Phone call</option>
                <option value="text">Text message</option>
              </select>
            </div>
            <div className="form-field field-full">
              <label htmlFor="budget">Estimated DJ budget</label>
              <select id="budget" value={form.budget} onChange={(e) => update("budget", e.target.value)} aria-invalid={Boolean(errors.budget)} aria-describedby={errors.budget ? "budget-error" : undefined}>
                <option value="">Choose the closest range</option>
                <option>Under $600</option>
                <option>$600 to $900</option>
                <option>$900 to $1,300</option>
                <option>$1,300 to $2,000</option>
                <option>More than $2,000</option>
                <option>Not sure yet</option>
              </select>
              <FieldError field="budget" message={errors.budget} />
            </div>
            <div className="form-field field-full">
              <label htmlFor="notes">Anything important before the quote?</label>
              <textarea id="notes" value={form.notes} onChange={(e) => update("notes", e.target.value)} placeholder="Tell me about the occasion, the people or anything the venue has already confirmed." />
            </div>
          </div>
        </section>
      ) : null}

      {step === 3 ? (
        <section className="form-stage" aria-labelledby="review-step">
          <h2 id="review-step" tabIndex={-1}>Check the details.</h2>
          <p className="form-support">Submitting creates an enquiry for review. It does not reserve the date or confirm the booking.</p>
          <dl className="review-list">
            {review.map((item) => (
              <div key={item.label}>
                <dt>{item.label}</dt>
                <dd>{item.value || "Not provided"}<button type="button" onClick={() => moveToStep(item.step)}>Change</button></dd>
              </div>
            ))}
          </dl>
          <label className="consent-row">
            <input type="checkbox" checked={form.consent} onChange={(e) => update("consent", e.target.checked)} aria-describedby={errors.consent ? "consent-error" : undefined} />
            <span>I agree that Sikuya may use these details to respond to this booking enquiry.</span>
          </label>
          <FieldError field="consent" message={errors.consent} />
          <div className="honeypot" aria-hidden="true">
            <label htmlFor="website">Website</label>
            <input id="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => update("website", e.target.value)} />
          </div>
          {submitError ? <p className="form-error" role="alert">{submitError} You can also email bookings@djsikuya.com.</p> : null}
        </section>
      ) : null}

      <div className="form-actions">
        {step > 0 ? <button type="button" onClick={() => moveToStep(step - 1)}>Back</button> : null}
        {step < 3 ? <button className="primary" type="button" onClick={nextStep}>Continue</button> : <button type="submit" disabled={submitting}>{submitting ? "Sending" : "Send enquiry"}</button>}
      </div>
    </form>
  );
}
