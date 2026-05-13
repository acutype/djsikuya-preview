import type { Metadata } from "next";
import { mixes } from "@/lib/site";

export const metadata: Metadata = {
  title: "Mixes",
  description: "DJ Sikuya mix samples and music direction.",
};

export default function MixesPage() {
  return (
    <main className="bg-ember-950 px-5 py-16 md:px-8">
      <div className="mx-auto max-w-6xl">
        <p className="text-sm font-semibold text-gold-200">mixes</p>
        <h1 className="mt-4 max-w-3xl text-4xl font-black leading-tight text-warm-white md:text-6xl">
          three lanes, one room.
        </h1>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {mixes.map((mix) => (
            <a className="surface rounded-2xl p-6 transition hover:border-gold-300/40" href={mix.href} key={mix.title}>
              <p className="text-sm font-semibold text-clay-400">{mix.eyebrow}</p>
              <h2 className="mt-4 text-2xl font-bold text-warm-white">{mix.title}</h2>
              <p className="mt-4 leading-7 text-warm-white/68">{mix.description}</p>
              <span className="mt-8 inline-flex text-sm font-semibold text-gold-200">
                open sample
              </span>
            </a>
          ))}
        </div>
      </div>
    </main>
  );
}
