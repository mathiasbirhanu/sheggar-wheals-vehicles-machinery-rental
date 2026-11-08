// Filter sidebar (FR-10..12) — server component, ZERO client JavaScript.
// Design patterns reviewed from leading rental/travel sites:
//   - Airbnb  -> rounded pill "chips" for quick single choices (with an "Any" option)
//   - Turo    -> segmented control + "Show N cars" call-to-action button
//   - Booking.com -> grouped sections with small icons, active-filter badge, top reset
// Every control is still a plain input inside the GET form: chips are
// peer-checked radios, so filtering works even with JavaScript disabled.
import Link from "next/link";
import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search, SlidersHorizontal, X, ChevronDown, MapPin, CarFront, Wallet, CalendarDays, Fuel,
} from "lucide-react";

export type FilterParams = {
  q?: string; neighbourhood?: string; transmission?: string; fuelType?: string;
  seats?: string; minPrice?: string; maxPrice?: string; start?: string; end?: string; sort?: string;
};

const SELECT_CLS = "flex h-10 w-full appearance-none rounded-lg border border-input bg-background pl-3 pr-9 text-sm";
const CHEVRON = <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />;

function Section({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="space-y-2.5">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {icon} {title}
      </p>
      {children}
    </div>
  );
}

// Pill chip = hidden radio + styled span (pure CSS, form-submittable).
function Chip({ name, value, label, checked }: { name: string; value: string; label: string; checked: boolean }) {
  return (
    <label className="cursor-pointer">
      <input type="radio" name={name} value={value} defaultChecked={checked} className="peer sr-only" />
      <span className="inline-flex items-center rounded-full border bg-background px-3.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent peer-checked:border-brand peer-checked:bg-brand peer-checked:font-medium peer-checked:text-brand-foreground">
        {label}
      </span>
    </label>
  );
}

function ChipRow({ name, sp, options }: { name: string; sp: FilterParams; options: { value: string; label: string }[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <Chip key={o.value || "any"} name={name} value={o.value} label={o.label} checked={(sp[name as "seats"] ?? "") === o.value} />
      ))}
    </div>
  );
}

export function CarsFilterSidebar({ sp, neighbourhoods, active, total, sort }: {
  sp: FilterParams; neighbourhoods: string[]; active: number; total: number; sort: string;
}) {
  return (
    <form action="/cars" method="get" className="space-y-5 self-start rounded-2xl border bg-card p-5 shadow-sm lg:sticky lg:top-20">
      <input type="hidden" name="sort" value={sort} />

      {/* Header: title + active badge + reset (Booking.com pattern) */}
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <SlidersHorizontal className="h-4 w-4" /> Filters
          {active > 0 && (
            <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-brand px-1.5 py-0.5 text-[11px] font-semibold text-brand-foreground">
              {active}
            </span>
          )}
        </p>
        {active > 0 && (
          <Link href="/cars" className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground">
            <X className="h-3.5 w-3.5" /> Reset
          </Link>
        )}
      </div>

      <Section icon={<Search className="h-3.5 w-3.5" />} title="Search">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input id="q" name="q" defaultValue={sp.q ?? ""} placeholder="Make, model, area…" className="pl-9" aria-label="Search cars" />
        </div>
      </Section>

      <Section icon={<MapPin className="h-3.5 w-3.5" />} title="Location">
        <div className="relative">
          <select id="neighbourhood" name="neighbourhood" defaultValue={sp.neighbourhood ?? ""} className={SELECT_CLS} aria-label="Neighbourhood">
            <option value="">Any area in Addis</option>
            {neighbourhoods.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
          {CHEVRON}
        </div>
      </Section>

      <Section icon={<CarFront className="h-3.5 w-3.5" />} title="Vehicle">
        {/* Turo-style segmented control */}
        <div className="grid grid-cols-3 gap-1 rounded-lg border p-1">
          {[{ v: "", l: "Any" }, { v: "AUTOMATIC", l: "Auto" }, { v: "MANUAL", l: "Manual" }].map((o) => (
            <label key={o.v || "any"} className="cursor-pointer">
              <input type="radio" name="transmission" value={o.v} defaultChecked={(sp.transmission ?? "") === o.v} className="peer sr-only" />
              <span className="flex justify-center rounded-md py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent peer-checked:bg-brand peer-checked:font-medium peer-checked:text-brand-foreground">
                {o.l}
              </span>
            </label>
          ))}
        </div>
        <div className="space-y-1.5 pt-1">
          <p className="text-xs text-muted-foreground">Seats</p>
          <ChipRow name="seats" sp={sp} options={[{ value: "", label: "Any" }, { value: "2", label: "2+" }, { value: "4", label: "4+" }, { value: "5", label: "5+" }, { value: "7", label: "7+" }]} />
        </div>
        <div className="space-y-1.5 pt-1">
          <p className="text-xs text-muted-foreground">Fuel</p>
          <ChipRow name="fuelType" sp={sp} options={[{ value: "", label: "Any" }, { value: "PETROL", label: "Petrol" }, { value: "DIESEL", label: "Diesel" }, { value: "HYBRID", label: "Hybrid" }, { value: "ELECTRIC", label: "Electric" }]} />
        </div>
      </Section>

      <Section icon={<Wallet className="h-3.5 w-3.5" />} title="Price per day">
        <div className="grid grid-cols-2 gap-2">
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">ETB</span>
            <Input name="minPrice" type="number" min={0} defaultValue={sp.minPrice ?? ""} placeholder="Min" className="pl-10" aria-label="Minimum price per day" />
          </div>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">ETB</span>
            <Input name="maxPrice" type="number" min={0} defaultValue={sp.maxPrice ?? ""} placeholder="Max" className="pl-10" aria-label="Maximum price per day" />
          </div>
        </div>
      </Section>

      <Section icon={<CalendarDays className="h-3.5 w-3.5" />} title="Availability">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">From</span>
            <Input name="start" type="date" defaultValue={sp.start ?? ""} className="h-9 text-sm" aria-label="Available from" />
          </div>
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">Until</span>
            <Input name="end" type="date" defaultValue={sp.end ?? ""} className="h-9 text-sm" aria-label="Available until" />
          </div>
        </div>
      </Section>

      {/* Turo-style CTA showing live result count */}
      <Button type="submit" className="h-10 w-full rounded-lg bg-brand text-brand-foreground hover:bg-brand/90">
        <Search className="h-4 w-4" /> Show {total} {total === 1 ? "car" : "cars"}
      </Button>

      <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
        Filters live in the URL — every view is shareable &amp; reload-safe.
      </p>
    </form>
  );
}
