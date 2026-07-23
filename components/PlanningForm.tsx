"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";

type PlanningData = {
  accessTime: string;
  venueContact: string;
  venuePhone: string;
  runSheet: string;
  keyMoments: string;
  mustPlay: string;
  doNotPlay: string;
  requests: string;
  setupAccess: string;
  parking: string;
  otherSuppliers: string;
  finalNotes: string;
  consent: boolean;
};

const initial: PlanningData = {
  accessTime: "",
  venueContact: "",
  venuePhone: "",
  runSheet: "",
  keyMoments: "",
  mustPlay: "",
  doNotPlay: "",
  requests: "Ask me first",
  setupAccess: "",
  parking: "",
  otherSuppliers: "",
  finalNotes: "",
  consent: false,
};

const planningSteps = ["Timeline", "Music", "Logistics", "Review"];

type TransitionDocument = Document & {
  startViewTransition?: (update: () => void) => void;
};

export default function PlanningForm({ token }: { token: string }) {
  const [step, setStep] = useState(0);
  const [furthestStep, setFurthestStep] = useState(0);
  const [form, setForm] = useState(initial);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [complete, setComplete] = useState<{ preview: boolean } | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const firstStepRender = useRef(true);

  useEffect(() => {
    document.title = `Planning step ${step + 1} of 4: ${planningSteps[step]} | Sikuya`;
    if (firstStepRender.current) {
      firstStepRender.current = false;
      return;
    }
    window.requestAnimationFrame(() => {
      const heading = document.getElementById(["planning-timeline", "planning-music", "planning-logistics", "planning-review"][step]);
      heading?.focus({ preventScroll: true });
      heading?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
        block: "start",
      });
    });
  }, [step]);

  function update<K extends keyof PlanningData>(field: K, value: PlanningData[K]) {
    setForm((current) => ({ ...current, [field]: value }));
    setError("");
  }

  function showError(message: string) {
    setError(message);
    window.requestAnimationFrame(() => errorRef.current?.focus());
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

  function next() {
    if (step === 0 && (!form.accessTime || !form.venueContact || !form.venuePhone || !form.runSheet.trim())) {
      showError("Complete the venue contact, access time and run sheet before continuing.");
      return;
    }
    if (step === 1 && (!form.mustPlay.trim() || !form.keyMoments.trim())) {
      showError("Add the key moments and a starting point for the music before continuing.");
      return;
    }
    const destination = Math.min(3, step + 1);
    setFurthestStep((current) => Math.max(current, destination));
    moveToStep(destination);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.consent) {
      showError("Confirm that this is the event plan you want Sikuya to review.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/planning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, ...form }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "The event plan could not be saved.");
      setComplete({ preview: Boolean(payload.preview) });
    } catch (caught) {
      showError(caught instanceof Error ? caught.message : "The event plan could not be saved.");
    } finally {
      setSubmitting(false);
    }
  }

  if (complete) {
    return (
      <section className="success-panel" aria-live="polite">
        <p className="eyebrow">Plan received</p>
        <h2>The room is taking shape.</h2>
        <p>Your event plan is ready for review. Any final questions will come through the contact method on your booking.</p>
        {complete.preview ? <p className="preview-notice">Preview only. No production booking state was changed.</p> : null}
        <Link className="primary-cta" href="/">Return home</Link>
      </section>
    );
  }

  return (
    <form className="guided-form" onSubmit={submit}>
      <nav className="form-progress planning-progress" aria-label="Event planning progress">
        <ol>
          {planningSteps.map((title, index) => (
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
      <div className="form-step-label"><span>Planning step {step + 1} of 4</span><span>{planningSteps[step]}</span></div>

      {error ? (
        <div className="error-summary" role="alert" tabIndex={-1} ref={errorRef}>
          <strong>This stage needs attention.</strong>
          <p>{error}</p>
        </div>
      ) : null}

      {step === 0 ? (
        <section className="form-stage" aria-labelledby="planning-timeline">
          <h2 id="planning-timeline" tabIndex={-1}>Build the event timeline.</h2>
          <p className="form-support">Start with venue access, the main contact and the order of the night.</p>
          <div className="field-grid">
            <div className="form-field"><label htmlFor="accessTime">Access and setup time</label><input id="accessTime" type="time" value={form.accessTime} onChange={(e) => update("accessTime", e.target.value)} /></div>
            <div className="form-field"><label htmlFor="venueContact">Venue contact</label><input id="venueContact" value={form.venueContact} onChange={(e) => update("venueContact", e.target.value)} /></div>
            <div className="form-field"><label htmlFor="venuePhone">Venue contact number</label><input id="venuePhone" type="tel" inputMode="tel" autoComplete="tel" value={form.venuePhone} onChange={(e) => update("venuePhone", e.target.value)} /></div>
            <div className="form-field field-full"><label htmlFor="runSheet">Run sheet</label><textarea id="runSheet" value={form.runSheet} onChange={(e) => update("runSheet", e.target.value)} placeholder="6:00 PM access, 7:00 PM guests arrive, 8:30 PM speeches, 9:00 PM dance floor" /></div>
          </div>
        </section>
      ) : null}

      {step === 1 ? (
        <section className="form-stage" aria-labelledby="planning-music">
          <h2 id="planning-music" tabIndex={-1}>Shape the music and moments.</h2>
          <p className="form-support">This is direction, not a demand for a hundred song titles. Leave room for the crowd to be read on the night.</p>
          <div className="field-grid">
            <div className="form-field field-full"><label htmlFor="keyMoments">Key moments and announcements</label><textarea id="keyMoments" value={form.keyMoments} onChange={(e) => update("keyMoments", e.target.value)} placeholder="Entrance, speeches, cake, first dance or any planned announcement" /></div>
            <div className="form-field"><label htmlFor="mustPlay">Important songs or artists</label><textarea id="mustPlay" value={form.mustPlay} onChange={(e) => update("mustPlay", e.target.value)} /></div>
            <div className="form-field"><label htmlFor="doNotPlay">Do not play</label><textarea id="doNotPlay" value={form.doNotPlay} onChange={(e) => update("doNotPlay", e.target.value)} placeholder="Songs, artists or explicit content to avoid" /></div>
            <div className="form-field field-full"><label htmlFor="requests">Guest requests</label><select id="requests" value={form.requests} onChange={(e) => update("requests", e.target.value)}><option>Ask me first</option><option>Requests are welcome</option><option>No guest requests</option></select></div>
          </div>
        </section>
      ) : null}

      {step === 2 ? (
        <section className="form-stage" aria-labelledby="planning-logistics">
          <h2 id="planning-logistics" tabIndex={-1}>Finish the practical plan.</h2>
          <p className="form-support">Access, parking and supplier details prevent surprises during setup.</p>
          <div className="field-grid">
            <div className="form-field"><label htmlFor="setupAccess">Loading and setup access</label><textarea id="setupAccess" value={form.setupAccess} onChange={(e) => update("setupAccess", e.target.value)} /></div>
            <div className="form-field"><label htmlFor="parking">Parking</label><textarea id="parking" value={form.parking} onChange={(e) => update("parking", e.target.value)} /></div>
            <div className="form-field field-full"><label htmlFor="otherSuppliers">Other suppliers and contacts</label><textarea id="otherSuppliers" value={form.otherSuppliers} onChange={(e) => update("otherSuppliers", e.target.value)} placeholder="Planner, MC, photographer, venue technician or band" /></div>
            <div className="form-field field-full"><label htmlFor="finalNotes">Anything else</label><textarea id="finalNotes" value={form.finalNotes} onChange={(e) => update("finalNotes", e.target.value)} /></div>
          </div>
          <div className="planning-readiness" aria-label="Event plan readiness">
            <span className="is-ready">Timeline captured</span>
            <span className="is-ready">Music direction captured</span>
            <span className={form.setupAccess.trim() || form.parking.trim() ? "is-ready" : ""}>Access details reviewed</span>
          </div>
        </section>
      ) : null}

      {step === 3 ? (
        <section className="form-stage" aria-labelledby="planning-review">
          <h2 id="planning-review" tabIndex={-1}>Review the event plan.</h2>
          <p className="form-support">Check the key information before sending it for review. Nothing here changes the agreed quote or booking terms.</p>
          <dl className="review-list planning-review-list">
            <div><dt>Timeline</dt><dd>{form.runSheet || "Not provided"}<button type="button" onClick={() => moveToStep(0)}>Change</button></dd></div>
            <div><dt>Venue contact</dt><dd>{form.venueContact} · {form.venuePhone}<button type="button" onClick={() => moveToStep(0)}>Change</button></dd></div>
            <div><dt>Key moments</dt><dd>{form.keyMoments || "Not provided"}<button type="button" onClick={() => moveToStep(1)}>Change</button></dd></div>
            <div><dt>Music direction</dt><dd>{form.mustPlay || "Not provided"}<button type="button" onClick={() => moveToStep(1)}>Change</button></dd></div>
            <div><dt>Access and parking</dt><dd>{[form.setupAccess, form.parking].filter(Boolean).join(" · ") || "Not provided"}<button type="button" onClick={() => moveToStep(2)}>Change</button></dd></div>
            <div><dt>Suppliers</dt><dd>{form.otherSuppliers || "Not provided"}<button type="button" onClick={() => moveToStep(2)}>Change</button></dd></div>
          </dl>
          <label className="consent-row"><input type="checkbox" checked={form.consent} onChange={(e) => update("consent", e.target.checked)} /><span>I confirm that this event plan is ready for Sikuya to review.</span></label>
        </section>
      ) : null}

      <div className="form-actions">
        {step > 0 ? <button type="button" onClick={() => moveToStep(step - 1)}>Back</button> : null}
        {step < 3 ? <button className="primary" type="button" onClick={next}>Continue</button> : <button type="submit" disabled={submitting}>{submitting ? "Saving" : "Send event plan"}</button>}
      </div>
    </form>
  );
}
