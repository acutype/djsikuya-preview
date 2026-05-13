import type { Metadata } from "next";
import Link from "next/link";
import { bookingEmail } from "@/lib/site";

export const metadata: Metadata = {
  title: "Press",
  description: "DJ Sikuya press and booking kit.",
};

export default function PressPage() {
  return (
    <main className="bg-ember-950 px-5 py-16 md:px-8">
      <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[0.86fr_1.14fr]">
        <section>
          <p className="text-sm font-semibold text-gold-200">press kit</p>
          <h1 className="mt-4 text-4xl font-black leading-tight text-warm-white md:text-6xl">
            short bio, sound lane and booking contact.
          </h1>
        </section>
        <section className="surface rounded-2xl p-6 md:p-8">
          <dl className="grid gap-6">
            <div>
              <dt className="text-sm font-semibold text-clay-400">short bio</dt>
              <dd className="mt-2 leading-7 text-warm-white/74">
                DJ Sikuya is a Filipino-Australian DJ in Perth, blending R&B, Afrobeats and UKG
                for warm social-dance rooms.
              </dd>
            </div>
            <div>
              <dt className="text-sm font-semibold text-clay-400">sound</dt>
              <dd className="mt-2 leading-7 text-warm-white/74">
                R&B edits, Afro-influenced rhythm, UKG bounce and vocal-led transitions.
              </dd>
            </div>
            <div>
              <dt className="text-sm font-semibold text-clay-400">booking</dt>
              <dd className="mt-2">
                <a className="text-gold-200 underline underline-offset-4" href={`mailto:${bookingEmail}`}>
                  {bookingEmail}
                </a>
              </dd>
            </div>
          </dl>
          <Link className="button-primary mt-8" href="/book">
            send a booking request
          </Link>
        </section>
      </div>
    </main>
  );
}
