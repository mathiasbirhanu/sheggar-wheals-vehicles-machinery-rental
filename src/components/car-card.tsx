import Link from "next/link";
import { ArrowRight, Cog, Fuel, MapPin, Users } from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CarImage } from "@/components/car-image";
import { formatETB } from "@/lib/pricing";
import type { FuelType, Transmission } from "@/lib/domain";

// FR-32 v2: readable fuel-category labels for the badge.
const FUEL_LABEL: Record<FuelType, string> = { PETROL: "Petrol", DIESEL: "Diesel", HYBRID: "Hybrid", ELECTRIC: "Electric" };

export type CarCardData = {
  id: string;
  make: string;
  model: string;
  year: number;
  transmission: Transmission;
  fuelType: FuelType;
  seats: number;
  neighbourhood: string;
  pricePerDay: number;
  photos: string[];
  avgRating?: number | null;
  reviewsCount?: number;
  discountPercent?: number | null; // live car-scoped offer (upper-left badge + voucher maths)
};

// Server component — every effect below is pure CSS (transform/opacity/shadow),
// so "attractive" costs zero JavaScript and zero new bytes. The brand flavor
// comes from the same --brand token the header/footer use (single source of truth).
export function CarCard({ car }: { car: CarCardData }) {
  const title = `${car.make} ${car.model} ${car.year}`;
  // Card maths mirrors computeTotals per-day — the badge is informational,
  // the real money maths always happens server-side at request time (BR-11).
  const pct = Number.isFinite(car.discountPercent) && car.discountPercent! > 0 ? Math.min(Math.round(car.discountPercent!), 100) : 0;
  const discountedPerDay = Math.round((car.pricePerDay * (100 - pct)) / 100);
  const aria = pct
    ? `${title} in ${car.neighbourhood}, ${formatETB(car.pricePerDay)} per day, ${pct} percent off — ${formatETB(discountedPerDay)} per day`
    : `${title} in ${car.neighbourhood}, ${formatETB(car.pricePerDay)} per day`;
  return (
    <Link
      href={`/cars/${car.id}`}
      className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      aria-label={aria}
    >
      <Card className="h-full gap-0 overflow-hidden py-0 transition-all duration-300 ease-out group-hover:-translate-y-1 group-hover:shadow-xl group-hover:shadow-brand/15 group-hover:ring-1 group-hover:ring-brand/30">
        <div className="relative aspect-[16/10] w-full overflow-hidden">
          <CarImage
            src={car.photos[0]}
            alt={title}
            className="absolute inset-0 h-full w-full transition-transform duration-500 ease-out group-hover:scale-105"
          />
          {/* Scrim so the chips stay readable on any photo */}
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/55 to-transparent" aria-hidden />
          {pct > 0 && (
            <span
              className="absolute left-2 top-2 rounded-full bg-brand px-2.5 py-1 text-xs font-extrabold tracking-wide text-brand-foreground shadow-lg shadow-brand/30"
              aria-label={`${pct} percent discount live`}
            >
              −{pct}%
            </span>
          )}
          {typeof car.avgRating === "number" && car.reviewsCount ? (
            <span className="absolute right-2 top-2 rounded-full bg-background/90 px-2 py-0.5 text-xs font-semibold shadow-sm backdrop-blur">
              ★ {car.avgRating.toFixed(1)} <span className="font-normal text-muted-foreground">({car.reviewsCount})</span>
            </span>
          ) : (
            <span className="absolute right-2 top-2 rounded-full bg-brand/90 px-2 py-0.5 text-xs font-semibold text-brand-foreground shadow-sm backdrop-blur">New</span>
          )}
          {/* The price IS the brand moment — with an offer it shows the discounted day rate */}
          <span className="absolute bottom-2 left-2 rounded-lg bg-brand px-2.5 py-1 text-sm font-bold text-brand-foreground shadow-lg">
            {pct > 0 && <span className="mr-1.5 font-normal line-through opacity-75">{car.pricePerDay.toLocaleString("en-US")}</span>}
            {formatETB(discountedPerDay)}
            <span className="ml-1 font-medium opacity-80">/day</span>
          </span>
        </div>

        {/* Brand energy line — sweeps via scaleX only (GPU), never re-lays-out the card */}
        <div
          aria-hidden
          className="mx-4 mt-3 h-0.5 origin-left scale-x-[0.12] rounded-full bg-brand/70 transition-transform duration-500 ease-out group-hover:scale-x-100"
        />

        <CardContent className="space-y-2 p-4 pt-3">
          <h3 className="font-semibold leading-tight">{title}</h3>
          <p className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 text-brand" /> {car.neighbourhood}, Addis Ababa
          </p>
        </CardContent>
        <CardFooter className="items-center justify-between gap-2 p-4 pt-0">
          <div className="flex gap-2">
            <Badge variant="secondary" className="gap-1 border border-brand/20 bg-brand/10 text-brand">
              <Users className="h-3 w-3" /> {car.seats} seats
            </Badge>
            <Badge variant="secondary" className="gap-1 border border-brand/20 bg-brand/10 text-brand">
              <Cog className="h-3 w-3" /> {car.transmission.toLowerCase()}
            </Badge>
            <Badge variant="secondary" className="gap-1 border border-brand/20 bg-brand/10 text-brand">
              <Fuel className="h-3 w-3" /> {FUEL_LABEL[car.fuelType]}
            </Badge>
          </div>
          <span
            aria-hidden
            className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand/10 text-brand transition-colors duration-300 group-hover:bg-brand group-hover:text-brand-foreground"
          >
            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
          </span>
        </CardFooter>
      </Card>
    </Link>
  );
}
