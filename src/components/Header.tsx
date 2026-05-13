import Link from "next/link";
import { adminUrl, navItems } from "@/lib/site";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-warm-white/10 bg-ember-950/88 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 md:px-8">
        <Link className="text-lg font-semibold text-warm-white" href="/">
          DJ SIKUYA
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-warm-white/68 md:flex">
          {navItems.map((item) => (
            <Link className="transition hover:text-gold-300" href={item.href} key={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
        <Link className="button-secondary hidden md:inline-flex" href={adminUrl}>
          admin
        </Link>
      </div>
    </header>
  );
}
