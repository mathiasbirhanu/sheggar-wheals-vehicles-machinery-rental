import Link from "next/link";
import { CarFront, Mail, MapPin, ShieldCheck } from "lucide-react";
import { site } from "@/lib/site";

const exploreLinks = [
  { href: "/cars", label: "Browse cars" },
  { href: "/signin", label: "Sign in" },
  { href: "/signup", label: "Create account" },
];

const platformLinks = [
  { href: "/dashboard", label: "My Bookings" },
  { href: "/bookings", label: "Booking history" },
  { href: "/notifications", label: "Notifications" },
];

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t bg-card/40">
      {/* Brand accent line — subtle tech gradient */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-brand/60 to-transparent" />

      <div className="mx-auto max-w-6xl px-4 py-10 pb-[max(2.5rem,env(safe-area-inset-bottom))]">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand column */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Link href="/" className="flex items-center gap-2 font-bold">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-brand-foreground shadow-sm">
                <CarFront className="h-5 w-5" aria-hidden />
              </span>
              {site.name}
            </Link>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">{site.tagline}.</p>
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-brand/25 bg-brand/10 px-2.5 py-1 text-[11px] font-medium text-brand">
              <ShieldCheck className="h-3 w-3" aria-hidden /> Escrow-held payments
            </p>
          </div>

          {/* Explore */}
          <nav aria-label="Explore">
            <h3 className="mb-3 text-sm font-semibold tracking-wide">Explore</h3>
            <ul className="space-y-2 text-sm">
              {exploreLinks.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-muted-foreground transition-colors hover:text-brand">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Platform */}
          <nav aria-label="Platform">
            <h3 className="mb-3 text-sm font-semibold tracking-wide">Platform</h3>
            <ul className="space-y-2 text-sm">
              {platformLinks.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-muted-foreground transition-colors hover:text-brand">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Contact */}
          <div>
            <h3 className="mb-3 text-sm font-semibold tracking-wide">Contact</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a href={`mailto:${site.supportEmail}`} className="inline-flex items-center gap-2 transition-colors hover:text-brand">
                  <Mail className="h-4 w-4 text-brand" aria-hidden /> {site.supportEmail}
                </a>
              </li>
              <li className="inline-flex items-center gap-2">
                <MapPin className="h-4 w-4 text-brand" aria-hidden /> {site.area}
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 flex flex-col items-center justify-between gap-2 border-t pt-6 text-center text-xs text-muted-foreground sm:flex-row sm:text-left">
          <p>
            © 2026 IBT-QIYAS — {site.name} <span className="font-mono text-[11px]">v{site.version}</span>. Capstone demo; all data and payments are simulated.
          </p>
          <p className="font-mono text-[11px] text-muted-foreground/70">Built with Next.js · Prisma · PostgreSQL</p>
        </div>
      </div>
    </footer>
  );
}
