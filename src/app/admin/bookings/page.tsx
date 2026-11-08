// All bookings view (FR-42): filters by status and date.
import Link from "next/link";
import { AutoRefresh } from "@/components/auto-refresh";
import { apiGet } from "@/lib/api";
import { requireActiveUser } from "@/lib/auth";
import { formatETB, formatDate } from "@/lib/pricing";
import { BookingStatusBadge, PaymentStatusBadge } from "@/components/status-badges";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { type BookingStatus } from "@/lib/domain";

export const dynamic = "force-dynamic";
export const metadata = { title: "All bookings" };

const STATUSES = ["", "REQUESTED", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "REVIEWED", "DECLINED", "CANCELLED", "DISPUTED", "RESOLVED"];

export default async function AdminBookingsPage({ searchParams }: { searchParams: Promise<{ status?: string; from?: string; to?: string; payment?: string }> }) {
  await requireActiveUser();
  const sp = await searchParams;
  const qp = new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][]);
  const { bookings } = await apiGet<{ bookings: import("@/lib/domain").Booking[] }>("/api/view/admin/bookings" + (qp.toString() ? "?" + qp.toString() : ""));

  return (
    <div className="mx-auto max-w-5xl space-y-4 px-4 py-8">
      <AutoRefresh />
      <h1 className="text-2xl font-bold">All bookings <span className="text-base font-normal text-muted-foreground">({bookings.length})</span></h1>
      {sp.payment === "held" && <p className="text-sm text-muted-foreground">Showing only bookings whose payment is held in escrow.</p>}

      <form action="/admin/bookings" method="get" className="flex flex-wrap items-end gap-2 rounded-xl border p-4">
        <div className="space-y-1.5">
          <label htmlFor="status" className="text-xs font-medium text-muted-foreground">Status</label>
          <select id="status" name="status" defaultValue={sp.status ?? ""} className="flex h-10 w-44 rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="">Any</option>
            {STATUSES.filter(Boolean).map((s) => <option key={s} value={s}>{s.replace("_", " ").toLowerCase()}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="from" className="text-xs font-medium text-muted-foreground">From</label>
          <Input id="from" name="from" type="date" defaultValue={sp.from ?? ""} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="to" className="text-xs font-medium text-muted-foreground">To</label>
          <Input id="to" name="to" type="date" defaultValue={sp.to ?? ""} />
        </div>
        <Button type="submit" size="sm">Apply</Button>
        <Button asChild size="sm" variant="ghost"><Link href="/admin/bookings">Reset</Link></Button>
      </form>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">All bookings with car, renter, owner, dates, totals, and status</caption>
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th scope="col" className="p-3 font-medium">Car</th><th scope="col" className="p-3 font-medium">Renter</th><th scope="col" className="p-3 font-medium">Owner</th>
                  <th scope="col" className="p-3 font-medium">Dates</th><th scope="col" className="p-3 text-right font-medium">Total</th><th scope="col" className="p-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id} className="border-b last:border-0">
                    <td className="p-3"><Link href={"/bookings/" + b.id} className="font-medium hover:underline">{b.car.make} {b.car.model}</Link></td>
                    <td className="p-3">{b.renter.name}</td>
                    <td className="p-3">{b.owner.name}</td>
                    <td className="p-3 text-muted-foreground">{formatDate(b.startDate)} → {formatDate(b.endDate)}</td>
                    <td className="p-3 text-right font-semibold">{formatETB(b.total)}</td>
                    <td className="p-3"><div className="flex flex-wrap gap-1"><BookingStatusBadge status={b.status} /><PaymentStatusBadge status={b.paymentStatus} />{b.paymentMethod && <span className="text-[11px] text-muted-foreground self-center">via {b.paymentMethod}</span>}</div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      <p className="text-sm text-muted-foreground"><Link href="/admin" className="text-brand hover:underline">← Admin console</Link></p>
    </div>
  );
}
