import type { Metadata } from "next";
import { BookingForm } from "@/components/BookingForm";
import { adminUrl, bookingEmail } from "@/lib/site";

export const metadata: Metadata = {
  title: "Book",
  description: "Send a DJ Sikuya booking request for Perth events.",
};

export default function BookPage() {
  return (
    <main className="bg-ember-950 px-5 py-16 md:px-8">
      <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[0.82fr_1.18fr]">
        <section>
          <p className="text-sm font-semibold text-gold-200">booking request</p>
          <h1 className="mt-4 text-4xl font-black leading-tight text-warm-white md:text-6xl">
            tell me the room before we talk price.
          </h1>
          <p className="mt-6 text-lg leading-8 text-warm-white/72">
            Requests go to {bookingEmail}. Confirmed bookings move through the private admin desk for quotes,
            invoices and client follow-up.
          </p>
          <a className="button-secondary mt-8" href={adminUrl}>
            admin login
          </a>
        </section>
        <section className="surface rounded-2xl p-5 md:p-8">
          <BookingForm />
        </section>
      </div>
    </main>
  );
}
