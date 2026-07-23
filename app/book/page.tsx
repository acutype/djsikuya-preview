import type { Metadata } from "next";
import Link from "next/link";
import QualificationForm from "@/components/QualificationForm";

export const metadata: Metadata = {
  title: "Book Sikuya | Sikuya",
  description: "Tell Sikuya about your event, venue, timing, crowd and music direction.",
};

export default function BookPage() {
  const previewMode = process.env.BOOKING_PREVIEW_MODE === "true";

  return (
    <main className="flow-page booking-flow">
      <header className="flow-header">
        <Link className="flow-brand" href="/">SIKUYA</Link>
        <span>Booking enquiry · AU · PH</span>
        <Link href="/">Back home</Link>
      </header>
      <div className="flow-shell">
        <aside className="flow-intro">
          <div className="flow-signal" aria-hidden="true">
            <span>01</span>
            <i />
            <strong>Your enquiry</strong>
          </div>
          <div>
            <p className="eyebrow">Book Sikuya</p>
            <h1>Tell me about your event.</h1>
            <p>
              Share the essentials so I can review the date, understand what you need and prepare
              an accurate quote. Once your booking is confirmed, you will receive a private
              planning form.
            </p>
          </div>
          <div className="flow-assurance">
            <span>About four minutes</span>
            <span>{previewMode ? "Your details stay in this preview" : "Your details are used to respond to this enquiry"}</span>
            <span>Your enquiry does not reserve the date</span>
          </div>
        </aside>
        <div className="flow-main">
          <QualificationForm />
        </div>
      </div>
    </main>
  );
}
