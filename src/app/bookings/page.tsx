// Renter bookings (FR-26..28): history with status/date filters, CSV export, next trip.
import Link from "next/link";
import { AutoRefresh } from "@/components/auto-refresh";
import { apiGet } from "@/lib/api";
import { requireActiveUser } from "@/lib/auth";
import { formatETB, formatDate } from "@/lib/pricing";
import { BookingStatusBadge, PaymentStatusBadge } from "@/components/status-badges";
import { type Booking } from "@/lib/domain";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "My bookings" };

type BookingStatus = "REQUESTED" | "CONFIRMED" | "IN_PROGRESS" | "COMPLETED" | "REVIEWED" | "DECLINED" | "CANCELLED" | "DISPUTED" | "RESOLVED";
const FILTERS: { value: string; label: string; statuses?: BookingStatus[] }[] = [
  { value: "", label: "All" },
  { value: "upcoming", label: "Upcoming", statuses: ["REQUESTED", "CONFIRMED"] },
  { value: "active", label: "In progress", statuses: ["IN_PROGRESS"] },
  { value: "past", label: "Past", statuses: ["COMPLETED", "REVIEWED", "RESOLVED"] },
  { value: "cancelled", label: "Cancelled", statuses: ["CANCELLED", "DECLINED"] },
  { value: "disputed", label: "Disputed", statuses: ["DISPUTED"] },
];

export default async function BookingsPage({ searchParams }: { searchParams: Promise<{ status?: string; from?: string; to?: string }> }) {
  const user = await requireActiveUser();
  const sp = await searchParams;
  const activeFilter = FILTERS.find((f) => f.value === (sp.status ?? "")) ?? FILTERS[0];

  const qp = new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][]);
  const { bookings, next, totalSpend } = await apiGet<{
    bookings: Booking[];
    next: Booking | null;
    totalSpend: number;
  }>("/api/view/bookings" + (qp.toString() ? "?" + qp.toString() : ""));

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <AutoRefresh />
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">My bookings</h1>
          <p className="text-sm text-muted-foreground">Lifetime demo spend: <span className="font-semibold text-foreground">{formatETB(totalSpend)}</span></p>
        </div>
        <Button asChild variant="outline" size="sm">
          <a href={csvHref(sp)} download><Download className="mr-2 h-4 w-4" /> Export CSV</a>
        </Button>
      </header>

      {next && (
        <div className="rounded-xl border border-brand/25 bg-brand/10 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand">Your next trip</p>
          <p className="mt-1 font-semibold">{next.car.make} {next.car.model} · {formatDate(next.startDate)} → {formatDate(next.endDate)}</p>
          <Button asChild size="sm" variant="secondary" className="mt-2"><Link href={"/bookings/" + next.id}>View booking</Link></Button>
        </div>
      )}

      <nav aria-label="Booking filters" className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <Button key={f.value} asChild size="sm" variant={f.value === activeFilter.value ? "secondary" : "ghost"}>
            <Link href={f.value ? "/bookings?status=" + f.value : "/bookings"}>{f.label}</Link>
          </Button>
        ))}
      </nav>

      {bookings.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center">
          <p className="font-medium">No bookings here yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Requests, confirmed trips, and past rentals all appear in this list.</p>
          <Button asChild size="sm" className="mt-4 bg-brand text-brand-foreground hover:bg-brand/90"><Link href="/cars">Browse cars</Link></Button>
        </div>
      ) : (
        <ul className="space-y-3">
          {bookings.map((b) => (
            <li key={b.id}>
              <Link href={"/bookings/" + b.id} className="block rounded-xl border p-4 transition-colors hover:border-brand/50 hover:bg-muted/30">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold">{b.car.make} {b.car.model}</p>
                    <p className="text-sm text-muted-foreground">{formatDate(b.startDate)} → {formatDate(b.endDate)} · {b.days} day{b.days > 1 ? "s" : ""}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <BookingStatusBadge status={b.status} />
                    <PaymentStatusBadge status={b.paymentStatus} />
                    <p className="font-bold">{formatETB(b.total)}</p>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function totalSpend(rows: { total: number }[]) { return rows.reduce((a, r) => a + r.total, 0); }
void totalSpend;
function csvHref(sp: { status?: string; from?: string; to?: string }) {
  const p = new URLSearchParams();
  if (sp.status) p.set("status", sp.status);
  if (sp.from) p.set("from", sp.from);
  if (sp.to) p.set("to", sp.to);
  const q = p.toString();
  return "/api/export/bookings" + (q ? "?" + q : "");
}
