import Link from "next/link";
import { mixes, positioning, recentHighlights } from "@/lib/site";

export default function Home() {
  return (
    <main>
      <section className="hero-image min-h-[86vh] px-5 py-20 md:px-8 md:py-28">
        <div className="mx-auto flex min-h-[68vh] max-w-6xl items-center">
          <div className="max-w-3xl">
            <p className="mb-5 text-sm font-semibold text-gold-200">Perth-rooted DJ</p>
            <h1 className="max-w-4xl text-5xl font-black leading-[0.96] text-warm-white md:text-7xl">
              DJ Sikuya
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-warm-white/82 md:text-xl">
              {positioning}
            </p>
            <div className="mt-9 flex flex-col gap-4 sm:flex-row">
              <Link className="button-primary" href="/book">
                book a set
              </Link>
              <Link className="button-secondary" href="/mixes">
                hear the direction
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-ember-900 px-5 py-16 md:px-8">
        <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-sm font-semibold text-gold-200">the room</p>
            <h2 className="mt-3 text-3xl font-bold text-warm-white md:text-4xl">
              music for the part of the night where people actually connect.
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {recentHighlights.map((item) => (
              <div className="surface rounded-2xl p-5" key={item}>
                <p className="text-base leading-7 text-warm-white/78">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-ember-950 px-5 py-16 md:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-semibold text-gold-200">mix samples</p>
              <h2 className="mt-3 text-3xl font-bold text-warm-white md:text-4xl">
                R&B warmth, Afro rhythm, UKG lift.
              </h2>
            </div>
            <Link className="button-secondary w-fit" href="/mixes">
              more mixes
            </Link>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {mixes.map((mix) => (
              <a className="surface rounded-2xl p-6 transition hover:border-gold-300/40" href={mix.href} key={mix.title}>
                <p className="text-sm font-semibold text-clay-400">{mix.eyebrow}</p>
                <h3 className="mt-4 text-2xl font-bold text-warm-white">{mix.title}</h3>
                <p className="mt-4 leading-7 text-warm-white/68">{mix.description}</p>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-ember-800 px-5 py-16 md:px-8">
        <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <p className="text-sm font-semibold text-gold-200">booking desk</p>
            <h2 className="mt-3 text-3xl font-bold text-warm-white md:text-4xl">
              send the brief, then the admin flow handles quotes and invoices.
            </h2>
          </div>
          <Link className="button-primary" href="/book">
            start a booking request
          </Link>
        </div>
      </section>
    </main>
  );
}
