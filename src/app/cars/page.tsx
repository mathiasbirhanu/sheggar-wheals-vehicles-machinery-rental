// Catalogue (FR-08..12): search + filters + sort + pagination, all mirrored in URL params.
// The whole catalogue query now runs in the C# API (GET /api/view/cars).
import Link from "next/link";
import { apiGet } from "@/lib/api";
import type { Car } from "@/lib/domain";
import { CarCard } from "@/components/car-card";
import { CarsMap } from "@/components/cars-map";
import { CarsFilterSidebar } from "@/components/cars-filter-sidebar";
import { Button } from "@/components/ui/button";
import { SearchX } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Browse cars" };

const PAGE_SIZE = 6;
const SORTS = { "price-asc": "Price: low to high", "price-desc": "Price: high to low", newest: "Newest", popular: "Most reviewed" } as const;
void PAGE_SIZE;

type Params = { q?: string; neighbourhood?: string; transmission?: string; fuelType?: string; seats?: string; minPrice?: string; maxPrice?: string; start?: string; end?: string; sort?: string; page?: string };

export default async function CarsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const sort = (sp.sort && sp.sort in SORTS ? sp.sort : "newest") as keyof typeof SORTS;

  const query = new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][]);
  const data = await apiGet<{
    total: number;
    pages: number;
    page: number;
    slice: { car: Car; ratings: number[] }[];
    mapCars: { id: string; make: string; model: string; year: number; pricePerDay: number; neighbourhood: string; lat: number; lng: number; photo: string | null }[];
    neighbourhoods: string[];
    discountMap: Record<string, number>;
  }>("/api/view/cars?" + query.toString());

  const all = data.slice.map((s) => ({ ...s.car, reviews: s.ratings.map((rating) => ({ rating })) }));
  const total = data.total;
  const pages = data.pages;
  const clamped = data.page;
  const slice = all;
  const discountMap = data.discountMap;

  // Map search data: slim objects for ALL filtered cars (not just this page), capped for performance.
  const mapCars = data.mapCars;

  const neighbourhoods = data.neighbourhoods;
  const qs = (over: Partial<Params>) => { const p = new URLSearchParams({ ...sp, ...Object.fromEntries(Object.entries(over).filter(([, v]) => v !== undefined && v !== "")) } as Record<string, string>); p.set("page", "1"); return "/cars?" + p.toString(); };
  const pageQs = (p: number) => { const u = new URLSearchParams(Object.fromEntries(Object.entries(sp).filter(([, v]) => v !== undefined && v !== "")) as Record<string, string>); u.set("page", String(p)); return "/cars?" + u.toString(); };
  const active = Object.entries(sp).filter(([k, v]) => v && k !== "page" && k !== "sort").length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Browse cars <span className="text-base font-normal text-muted-foreground">({total} available)</span></h1>
        <p className="text-sm text-muted-foreground">Filters live in the URL — every view is shareable and reload-safe (FR-11).</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        {/* Filters — Airbnb/Turo/Booking-style sidebar, zero client JS */}
        <CarsFilterSidebar sp={sp} neighbourhoods={neighbourhoods} active={active} total={total} sort={sort} />

        {/* Results */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">Sorted by <span className="font-medium text-foreground">{SORTS[sort].toLowerCase()}</span></p>
            <div className="flex flex-wrap gap-1">
              {(Object.keys(SORTS) as (keyof typeof SORTS)[]).map((k) => (
                <Button key={k} asChild size="sm" variant={k === sort ? "secondary" : "ghost"}>
                  <Link href={qs({ sort: k })}>{SORTS[k]}</Link>
                </Button>
              ))}
            </div>
          </div>

          <CarsMap
            cars={mapCars}
            listSlot={
              <>
                {slice.length === 0 ? (
                  <div className="rounded-xl border border-dashed p-10 text-center">
                    <SearchX className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" aria-hidden />
                    <p className="font-medium">No cars match your filters</p>
                    <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">Try widening the price range, choosing another neighbourhood, or clearing the availability dates.</p>
                    <Button asChild variant="outline" size="sm" className="mt-4"><Link href="/cars">Clear all filters</Link></Button>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {slice.map((car) => {
                      const ratings = car.reviews.map((r) => r.rating);
                      return <CarCard key={car.id} car={{ ...car, avgRating: ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null, reviewsCount: ratings.length, discountPercent: discountMap[car.id] ?? null }} />;
                    })}
                  </div>
                )}

                {pages > 1 && (
                  <nav aria-label="Pagination" className="flex items-center justify-center gap-1 pt-2">
                    {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
                      <Button key={p} asChild size="sm" variant={p === clamped ? "secondary" : "ghost"} aria-current={p === clamped ? "page" : undefined}>
                        <Link href={pageQs(p)}>{p}</Link>
                      </Button>
                    ))}
                  </nav>
                )}
              </>
            }
          />
        </div>
      </div>
    </div>
  );
}
