import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About",
  description: "About DJ Sikuya.",
};

export default function AboutPage() {
  return (
    <main className="bg-ember-950 px-5 py-16 md:px-8">
      <div className="mx-auto max-w-4xl">
        <p className="text-sm font-semibold text-gold-200">about</p>
        <h1 className="mt-4 text-4xl font-black leading-tight text-warm-white md:text-6xl">
          Filipino-Australian DJ, Perth-rooted, built for social dance floors.
        </h1>
        <div className="mt-10 grid gap-7 text-lg leading-8 text-warm-white/76">
          <p>
            DJ Sikuya blends R&B, Afrobeats and UKG into sets that keep the room open: easy enough
            to talk over early, alive enough to move when the night turns.
          </p>
          <p>
            The sound sits between warm edits, familiar vocals and percussion-led pockets. It is made
            for birthdays, rooftops, private rooms and brand nights that need taste without losing the crowd.
          </p>
        </div>
        <div className="mt-10 flex flex-col gap-4 sm:flex-row">
          <Link className="button-primary" href="/book">
            book a set
          </Link>
          <Link className="button-secondary" href="/press">
            press kit
          </Link>
        </div>
      </div>
    </main>
  );
}
