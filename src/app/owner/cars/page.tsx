// Owner listings list (FR-33).
import Link from "next/link";
import { apiGet } from "@/lib/api";
import { requireActiveUser } from "@/lib/auth";
import { formatETB } from "@/lib/pricing";
import { CarStatusBadge } from "@/components/status-badges";
import { CarImage } from "@/components/car-image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus } from "lucide-react";
import type { Car } from "@/lib/domain";

export const dynamic = "force-dynamic";
export const metadata = { title: "My listings" };

export default async function OwnerCarsPage() {
  const user = await requireActiveUser();
  const { cars } = await apiGet<{ cars: { car: Car; bookingsCount: number }[] }>("/api/view/owner/cars");

  return (
    <div className="mx-auto max-w-4xl space-y-4 px-4 py-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My listings</h1>
        <Button asChild size="sm" className="bg-brand text-brand-foreground hover:bg-brand/90"><Link href="/owner/cars/new"><Plus className="mr-2 h-4 w-4" /> List a car</Link></Button>
      </header>
      {cars.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">You have not listed a car yet. Create your first listing — it goes to admin moderation before going live (BR-02).</CardContent></Card>
      ) : (
        <ul className="space-y-3">
          {cars.map(({ car, bookingsCount }) => (
            <li key={car.id}>
              <Card>
                <CardContent className="flex flex-wrap items-center gap-4 p-4">
                  <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-md"><CarImage src={car.photos[0]} alt={`${car.make} ${car.model}`} className="absolute inset-0 h-full w-full" /></div>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 font-semibold">{car.make} {car.model} <span className="font-normal text-muted-foreground">{car.year}</span> <CarStatusBadge status={car.status} /></p>
                    <p className="text-sm text-muted-foreground">{car.neighbourhood} · {formatETB(car.pricePerDay)}/day · {bookingsCount} booking{bookingsCount === 1 ? "" : "s"}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Button asChild size="sm" variant="outline"><Link href={"/owner/cars/" + car.id + "/edit"}>Edit</Link></Button>
                    <Button asChild size="sm" variant="outline"><Link href={"/owner/cars/" + car.id + "/availability"}>Availability</Link></Button>
                    <Button asChild size="sm" variant="secondary"><Link href={"/owner/cars/" + car.id + "/bookings"}>Bookings</Link></Button>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
