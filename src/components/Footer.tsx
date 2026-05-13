import Link from "next/link";
import { adminUrl, bookingEmail, navItems } from "@/lib/site";

export function Footer() {
  return (
    <footer className="border-t border-warm-white/10 bg-ember-950 px-5 py-10 text-sm text-warm-white/64 md:px-8">
      <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-[1fr_1fr_auto]">
        <div>
          <p className="text-base font-semibold text-warm-white">DJ SIKUYA</p>
          <p className="mt-3 max-w-md">
            Filipino-Australian DJ for R&B, Afro and UKG leaning rooms in Perth.
          </p>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-3">
          {navItems.map((item) => (
            <Link className="hover:text-gold-300" href={item.href} key={item.href}>
              {item.label}
            </Link>
          ))}
          <Link className="hover:text-gold-300" href={adminUrl}>
            admin
          </Link>
        </div>
        <a className="button-secondary w-fit" href={`mailto:${bookingEmail}`}>
          {bookingEmail}
        </a>
      </div>
    </footer>
  );
}
