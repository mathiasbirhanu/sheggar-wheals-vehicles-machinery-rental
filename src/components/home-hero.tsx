import Link from "next/link";
import { KeyRound, Search, ShieldCheck, Camera, BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Home hero — server component, zero client JS.
// The visual is an inline SVG (car + key): zero image downloads, no LCP photo,
// crisp on every screen, and it recolors itself with the --brand token in
// light AND dark mode. "Attractive" here costs 0 KB of network.
export function HomeHero({
  approvedCount,
  neighbourhoods,
  completedTrips,
}: {
  approvedCount: number;
  neighbourhoods: string[];
  completedTrips: number;
}) {
  const popular = neighbourhoods.slice(0, 4);
  const stats: Array<[string, number]> = [
    ["Cars available", approvedCount],
    ["Neighbourhoods", neighbourhoods.length],
    ["Trips completed", completedTrips],
  ];

  return (
    <section className="grid items-center gap-10 py-10 sm:py-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8">
      {/* LEFT — message, search, trust */}
      <div>
        <p className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
          <MapPinMini /> Addis Ababa&apos;s peer-to-peer car rental
        </p>

        <h1 className="mt-4 max-w-xl text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl">
          Rent a car from people you{" "}
          <span className="bg-gradient-to-r from-brand to-emerald-400 bg-clip-text text-transparent">trust</span>
        </h1>

        <p className="mt-4 max-w-lg text-lg text-muted-foreground">
          Verified local owners, escrow-held payments and photo-documented handovers — book in minutes, drive with peace of mind.
        </p>

        <form
          action="/cars"
          method="get"
          className="mt-6 flex max-w-lg flex-col gap-2 rounded-xl border bg-card p-3 shadow-sm focus-within:ring-2 focus-within:ring-brand/40 sm:flex-row"
        >
          <label className="sr-only" htmlFor="q">
            Search by make, model, or neighbourhood
          </label>
          <Input id="q" name="q" placeholder="Search make, model or neighbourhood…" className="sm:flex-1" />
          <Button type="submit" className="bg-brand text-brand-foreground hover:bg-brand/90">
            <Search className="mr-2 h-4 w-4" /> Search cars
          </Button>
        </form>

        {popular.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">Popular:</span>
            {popular.map((n) => (
              <Link
                key={n}
                href={`/cars?q=${encodeURIComponent(n)}`}
                className="rounded-full border px-3 py-1 text-muted-foreground transition-colors hover:border-brand/50 hover:bg-brand/10 hover:text-foreground"
              >
                {n}
              </Link>
            ))}
          </div>
        )}

        <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
          <li className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-brand" aria-hidden /> Escrow-protected payments</li>
          <li className="flex items-center gap-1.5"><BadgeCheck className="h-4 w-4 text-brand" aria-hidden /> Admin-verified owners</li>
          <li className="flex items-center gap-1.5"><Camera className="h-4 w-4 text-brand" aria-hidden /> Photo-documented handover</li>
        </ul>
      </div>

      {/* RIGHT — illustrated panel */}
      <div className="relative mx-auto w-full max-w-md lg:max-w-none">
        <div className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-brand/10 via-card to-card p-6 shadow-xl shadow-brand/10">
          <CarKeyArt className="mx-auto h-auto w-full max-w-sm" />

          {/* floating trust cards — pure CSS, decorative */}
          <div className="absolute left-4 top-4 flex items-center gap-2 rounded-xl border bg-card/95 px-3 py-2 text-xs font-medium shadow-md backdrop-blur">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand/15"><ShieldCheck className="h-4 w-4 text-brand" aria-hidden /></span>
            Payment held in escrow
          </div>
          <div className="absolute bottom-4 right-4 flex items-center gap-2 rounded-xl border bg-card/95 px-3 py-2 text-xs font-medium shadow-md backdrop-blur">
            <KeyRound className="h-4 w-4 text-brand" aria-hidden />
            Keys in minutes
          </div>
        </div>

        <dl className="mt-6 grid grid-cols-3 gap-4 text-center">
          {stats.map(([label, value]) => (
            <div key={label} className="rounded-xl border bg-card px-2 py-3">
              <dd className="text-2xl font-bold tabular-nums">{value}</dd>
              <dt className="text-xs text-muted-foreground">{label}</dt>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function MapPinMini() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-brand" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="3" />
    </svg>
  );
}

// Flat emerald illustration: a car ready for pickup with its key.
function CarKeyArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 420 300" className={className} role="img" aria-label="Illustration of a rental car with its key">
      <ellipse cx="210" cy="268" rx="150" ry="12" className="fill-brand/10" />
      {/* car body */}
      <path d="M60 218c-8 0-14-6-14-14v-38c0-10 6-18 16-21l38-11 34-34c6-6 14-9 22-9h86c9 0 17 4 23 10l30 33 52 12c11 3 18 12 18 23v35c0 8-6 14-14 14h-22" className="fill-brand" />
      <path d="M60 218h250" className="stroke-brand" strokeWidth="0" />
      {/* windows */}
      <path d="M150 134l30-30c3-3 7-5 12-5h28v35h-70Z" className="fill-card" opacity="0.9" />
      <path d="M232 99h42c5 0 9 2 12 5l25 30h-79V99Z" className="fill-card" opacity="0.9" />
      {/* lights */}
      <circle cx="330" cy="176" r="7" className="fill-amber-300" />
      <rect x="52" y="170" width="10" height="12" rx="3" className="fill-card" opacity="0.7" />
      {/* wheels */}
      <g>
        <circle cx="130" cy="232" r="30" className="fill-card stroke-brand" strokeWidth="8" />
        <circle cx="130" cy="232" r="10" className="fill-brand/40" />
        <circle cx="300" cy="232" r="30" className="fill-card stroke-brand" strokeWidth="8" />
        <circle cx="300" cy="232" r="10" className="fill-brand/40" />
      </g>
      <path d="M160 232h110" className="stroke-brand/40" strokeWidth="6" strokeLinecap="round" strokeDasharray="2 14" />
      {/* key + ring */}
      <g transform="translate(330 40) rotate(18)">
        <circle cx="0" cy="0" r="17" className="fill-none stroke-brand" strokeWidth="9" />
        <rect x="-4" y="14" width="8" height="58" rx="4" className="fill-brand" />
        <rect x="4" y="52" width="18" height="8" rx="3" className="fill-brand" />
        <rect x="4" y="66" width="13" height="8" rx="3" className="fill-brand" />
      </g>
      {/* sparkles */}
      <circle cx="70" cy="70" r="5" className="fill-brand/30" />
      <circle cx="248" cy="42" r="4" className="fill-brand/25" />
      <circle cx="390" cy="150" r="6" className="fill-brand/20" />
      <path d="M96 44l6 12 12 6-12 6-6 12-6-12-12-6 12-6 6-12Z" className="fill-brand/35" />
    </svg>
  );
}
