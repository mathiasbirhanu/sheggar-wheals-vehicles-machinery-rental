// Owner earnings (FR-37): monthly chart (Recharts) + accessible table + per-car summary + CSV.
import Link from "next/link";
import { apiGet } from "@/lib/api";
import { requireActiveUser } from "@/lib/auth";
import { formatETB } from "@/lib/pricing";
import { EarningsChart } from "@/components/earnings-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Earnings" };

export default async function OwnerEarningsPage() {
  const user = await requireActiveUser();
  const { bookings, heldRows } = await apiGet<{
    bookings: import("@/lib/domain").Booking[];
    heldRows: number;
  }>("/api/view/owner/earnings");

  // Owner income = the rental amount including any owner-driver fee (subtotal − discount
  // + driverTotal — the driver is the owner's, so the fee is owner income). The 10%
  // service fee on the OVERALL price (FR-49) is platform income, never the owner's.
  const ownerShare = (b: { subtotal: number; discountAmount: number; driverTotal: number }) => b.subtotal - b.discountAmount + b.driverTotal;

  const monthly = new Map<string, number>();
  for (const b of bookings) {
    const key = b.endDate.toISOString().slice(0, 7);
    monthly.set(key, (monthly.get(key) ?? 0) + ownerShare(b));
  }
  const chartData = [...monthly.entries()].sort().map(([month, earnings]) => ({ month, earnings }));

  const perCar = new Map<string, { label: string; total: number; trips: number }>();
  for (const b of bookings) {
    const key = b.car.id;
    const cur = perCar.get(key) ?? { label: `${b.car.make} ${b.car.model}`, total: 0, trips: 0 };
    cur.total += ownerShare(b); cur.trips += 1;
    perCar.set(key, cur);
  }
  const grand = bookings.reduce((a, b) => a + ownerShare(b), 0);

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Earnings</h1>
        <Button asChild variant="outline" size="sm"><a href="/api/export/owner-earnings" download><Download className="mr-2 h-4 w-4" /> Export CSV</a></Button>
      </header>

      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Card><CardContent className="p-4"><dt className="text-sm text-muted-foreground">Released rental income (your share, after the 10% platform fee)</dt><dd className="text-xl font-bold">{formatETB(grand)}</dd></CardContent></Card>
        <Card><CardContent className="p-4"><dt className="text-sm text-muted-foreground">Held in escrow now</dt><dd className="text-xl font-bold">{heldRows} booking{heldRows === 1 ? "" : "s"}</dd></CardContent></Card>
        <Card><CardContent className="p-4"><dt className="text-sm text-muted-foreground">Cars with completed trips</dt><dd className="text-xl font-bold">{perCar.size}</dd></CardContent></Card>
      </dl>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Monthly earnings — your share after the platform fee (by trip end date, FR-37)</CardTitle></CardHeader>
        <CardContent><EarningsChart data={chartData} /></CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Per-car summary</CardTitle></CardHeader>
        <CardContent className="p-0">
          {perCar.size === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">No completed trips yet. <Link href="/owner" className="text-brand hover:underline">Back to owner hub →</Link></p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <caption className="sr-only">Earnings per car: label, trips, total</caption>
                <thead>
                  <tr className="border-b text-left text-muted-foreground"><th scope="col" className="p-3 font-medium">Car</th><th scope="col" className="p-3 font-medium">Trips</th><th scope="col" className="p-3 text-right font-medium">Total</th></tr>
                </thead>
                <tbody>
                  {[...perCar.values()].map((row) => (
                    <tr key={row.label} className="border-b last:border-0">
                      <td className="p-3 font-medium">{row.label}</td><td className="p-3">{row.trips}</td><td className="p-3 text-right font-semibold">{formatETB(row.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
