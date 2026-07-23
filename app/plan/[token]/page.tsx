import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PlanningForm from "@/components/PlanningForm";

export const metadata: Metadata = {
  title: "Plan your event | Sikuya",
  description: "Complete the detailed event plan for a confirmed Sikuya booking.",
  robots: { index: false, follow: false },
};

export default async function PlanPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[a-zA-Z0-9_-]{8,160}$/.test(token)) notFound();

  return (
    <main className="flow-page planning-flow">
      <header className="flow-header">
        <Link className="flow-brand" href="/">SIKUYA</Link>
        <span>Private event planning</span>
        <a href="mailto:bookings@djsikuya.com">Need help?</a>
      </header>
      <div className="flow-shell">
        <aside className="flow-intro">
          <div className="flow-signal" aria-hidden="true">
            <span>02</span>
            <i />
            <strong>Event planning</strong>
          </div>
          <div>
            <p className="eyebrow">Plan your event</p>
            <h1>Now we shape the night.</h1>
            <p>This private form is for confirmed clients. It collects the full operational brief without changing the agreed quote or booking terms.</p>
          </div>
          <div className="flow-assurance">
            <span>Confirmed clients only</span>
            <span>Timeline, music and access</span>
            <span>Keep your private link until the event</span>
          </div>
        </aside>
        <div className="flow-main"><PlanningForm token={token} /></div>
      </div>
    </main>
  );
}
