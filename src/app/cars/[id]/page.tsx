// Car detail (FR-13..16): gallery, specs, availability, sample map, booking form, reviews.
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { apiGet, apiGetOr404 } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { formatETB, formatDate, toISODate, PLATFORM_FEE_RATE } from "@/lib/pricing";
import { site, siteUrl } from "@/lib/site";
import { PhotoGallery } from "@/components/photo-gallery";
import { MapView } from "@/components/map-view";
import { BookingForm } from "@/components/booking-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Star, Users, Gauge, Fuel, CalendarX2, CircleCheck } from "lucide-react";
import { CarStatus, type FuelType, type Car } from "@/lib/domain";

// FR-32 v2: readable fuel-category label for the spec badge.
const FUEL_LABEL: Record<FuelType, string> = { PETROL: "Petrol", DIESEL: "Diesel", HYBRID: "Hybrid", ELECTRIC: "Electric" };

export const dynamic = "force-dynamic";

/** SEO: per-listing title, description, canonical URL and Open Graph image. */
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const data = await apiGet<{ car: { make: string; model: string; year: number; neighbourhood: string; city: string; pricePerDay: number; photos: string[]; status: string } }>(`/api/view/cars/${id}/meta`);
  const car = data.car;
  if (!car || car.status !== CarStatus.APPROVED) return { title: "Car not found" };
  const name = `${car.make} ${car.model} ${car.year}`;
  const description = `Rent the ${name} in ${car.neighbourhood}, ${car.city} from ${formatETB(car.pricePerDay)}/day. Verified listing on ${site.name} — request, pay into escrow, and drive.`;
  return {
    title: `${name} · ${car.neighbourhood}`,
    description,
    alternates: { canonical: `/cars/${id}` },
    openGraph: { title: name, description, url: siteUrl(`/cars/${id}`), images: car.photos[0] ? [{ url: car.photos[0] }] : undefined },
  };
}

export default async function CarDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await apiGetOr404<{ car: Car; bookedRanges: { from: string; to: string; status: string }[]; discountPercent: number; isPublic: boolean; isOwner: boolean }>(`/api/view/cars/${id}`);
  const car = data.car;
  const user = await getCurrentUser();
  const isPublic = data.isPublic;
  const isOwner = data.isOwner;

  if (!isPublic && !isOwner) notFound();

  const reviews = car.reviews ?? [];
    const ratings = reviews.map((r) => r.rating);
  const avg = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;
  // Live offer for this exact car — 0 when none. Drives the badge + the form's discount line.
  const discountPercent = data.discountPercent;
  const blockedISO = car.unavailableDates.map(toISODate);
  const bookedRanges = data.bookedRanges;

  // SEO: schema.org vehicle + offer (+ aggregate rating) so search engines render
  // price/availability/rating rich results for approved listings only (BR-02).
  const jsonLd = isPublic
    ? {
        "@context": "https://schema.org",
        "@type": "Car",
        name: `${car.make} ${car.model} ${car.year}`,
        brand: { "@type": "Brand", name: car.make },
        model: car.model,
        productionDate: String(car.year),
        vehicleTransmission: car.transmission,
        seatingCapacity: car.seats,
        image: car.photos,
        description: car.description,
        offers: {
          "@type": "Offer",
          priceCurrency: "ETB",
          price: car.pricePerDay,
          availability: "https://schema.org/InStock",
          url: siteUrl(`/cars/${car.id}`),
          areaServed: { "@type": "City", name: car.city },
        },
        ...(avg !== null
          ? { aggregateRating: { "@type": "AggregateRating", ratingValue: avg.toFixed(1), reviewCount: ratings.length, bestRating: "5", worstRating: "1" } }
          : {}),
      }
    : null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {jsonLd && (
        <script
          type="application/ld+json"
          // Server-defined shape; field values come from moderated listing data.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-muted-foreground"><Link href="/cars" className="hover:text-foreground">Browse cars</Link> <span aria-hidden>/</span> {car.make} {car.model}</nav>
      {!isPublic && (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          This listing is <strong>{car.status.toLowerCase()}</strong> and is not visible in the public catalogue — only you as the owner can see this preview (BR-02).
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <PhotoGallery photos={car.photos} alt={`${car.make} ${car.model} ${car.year}`} />

          <section>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h1 className="text-2xl font-bold">{car.make} {car.model} <span className="font-normal text-muted-foreground">{car.year}</span></h1>
                <p className="text-sm text-muted-foreground">{car.neighbourhood}, {car.city}</p>
              </div>
              {avg !== null && (
                <p className="flex items-center gap-1 font-semibold"><Star className="h-5 w-5 fill-amber-400 text-amber-400" aria-hidden /> {avg.toFixed(1)} <span className="text-sm font-normal text-muted-foreground">({ratings.length} review{ratings.length > 1 ? "s" : ""})</span></p>
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant="secondary" className="gap-1"><Users className="h-3 w-3" /> {car.seats} seats</Badge>
              <Badge variant="secondary" className="gap-1"><Gauge className="h-3 w-3" /> {car.transmission.toLowerCase()}</Badge>
              <Badge variant="secondary" className="gap-1"><Fuel className="h-3 w-3" /> {FUEL_LABEL[car.fuelType]}</Badge>
              {car.driverFeePerDay != null && car.driverFeePerDay > 0 && (
                <Badge variant="secondary" className="gap-1"><Users className="h-3 w-3" /> Driver available · +{formatETB(car.driverFeePerDay)}/day</Badge>
              )}
              {discountPercent > 0 ? (
                <Badge className="gap-1 bg-brand text-brand-foreground hover:bg-brand">−{discountPercent}% live offer</Badge>
              ) : (
                <Badge variant="secondary">{formatETB(car.pricePerDay)}/day</Badge>
              )}
            </div>
            <p className="mt-4 leading-relaxed text-muted-foreground">{car.description}</p>
            <p className="mt-2 text-xs text-muted-foreground">Platform fee: {Math.round(PLATFORM_FEE_RATE * 100)}% — always included in the total you see before you commit (BR-04).</p>
          </section>

          <Separator />

          <section aria-labelledby="availability">
            <h2 id="availability" className="mb-3 font-semibold">Availability</h2>
            {blockedISO.length === 0 && bookedRanges.length === 0 ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground"><CircleCheck className="h-4 w-4 text-brand" /> Fully open — every day is bookable.</p>
            ) : (
              <div className="space-y-3 text-sm">
                {blockedISO.length > 0 && (
                  <div>
                    <p className="mb-1.5 flex items-center gap-1.5 font-medium"><CalendarX2 className="h-4 w-4" /> Blocked by the owner</p>
                    <div className="flex flex-wrap gap-1.5">{blockedISO.map((d) => <Badge key={d} variant="outline" className="text-red-700 line-through">{formatDate(d + "T00:00:00.000Z")}</Badge>)}</div>
                  </div>
                )}
                {bookedRanges.length > 0 && (
                  <div>
                    <p className="mb-1.5 font-medium">Held by active bookings</p>
                    <div className="flex flex-wrap gap-1.5">
                      {bookedRanges.map((r, i) => <Badge key={i} variant="outline" className="text-amber-800">{formatDate(r.from)} → {formatDate(r.to)} ({r.status.toLowerCase()})</Badge>)}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          <section aria-labelledby="location">
            <h2 id="location" className="mb-3 font-semibold">Location</h2>
            <MapView lat={car.lat} lng={car.lng} label={`${car.make} ${car.model} in ${car.neighbourhood}`} />
          </section>

          <section aria-labelledby="reviews">
            <h2 id="reviews" className="mb-3 font-semibold">Reviews {avg !== null && <span className="text-sm font-normal text-muted-foreground">· {avg.toFixed(1)} average</span>}</h2>
            {reviews.length === 0 ? (
              <p className="text-sm text-muted-foreground">No reviews yet — be the first to rent and review this car.</p>
            ) : (
              <ul className="space-y-4">
                {reviews.map((r) => (
                  <li key={r.id} className="rounded-lg border p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium">{r.renter.name}</p>
                      <p aria-label={`${r.rating} out of 5 stars`} className="flex">{Array.from({ length: 5 }, (_, i) => <Star key={i} className={`h-4 w-4 ${i < r.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} aria-hidden />)}</p>
                    </div>
                    <p className="mt-1.5 text-sm text-muted-foreground">{r.comment}</p>
                    {r.ownerReply && (
                      <div className="mt-3 rounded-md bg-muted p-3 text-sm">
                        <p className="text-xs font-semibold text-muted-foreground">Reply from {car.owner?.name}:</p>
                        <p className="mt-0.5">{r.ownerReply}</p>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Booking rail */}
        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-baseline justify-between text-xl">
                {discountPercent > 0 ? (
                  <>
                    <span>
                      <span className="mr-2 text-base font-normal text-muted-foreground line-through">{car.pricePerDay.toLocaleString("en-US")}</span>
                      {formatETB(Math.round((car.pricePerDay * (100 - discountPercent)) / 100))}
                    </span>
                    <span className="text-sm font-normal text-muted-foreground">per day</span>
                  </>
                ) : (
                  <>
                    <span>{formatETB(car.pricePerDay)}</span><span className="text-sm font-normal text-muted-foreground">per day</span>
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <BookingForm
                carId={car.id}
                pricePerDay={car.pricePerDay}
                blockedDates={[...blockedISO, ...bookedRanges.flatMap((r) => { const out: string[] = []; for (let d = new Date(r.from + "T00:00:00.000Z"); d <= new Date(r.to + "T00:00:00.000Z"); d.setUTCDate(d.getUTCDate() + 1)) out.push(toISODate(d)); return out; })]}
                signedIn={!!user}
                suspended={user?.status === "SUSPENDED"}
                discountPercent={discountPercent}
                driverFeePerDay={car.driverFeePerDay}
              />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/15 font-bold text-brand">{car.owner?.name?.[0]}</span>
              <div className="text-sm">
                <p className="font-medium">{car.owner?.name}</p>
                <p className="text-muted-foreground">Owner · joined {formatDate(car.owner?.createdAt ?? new Date())}</p>
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
