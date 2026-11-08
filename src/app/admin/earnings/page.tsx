// Admin income dashboard (FR-44): platform income vs owner income — KPIs, monthly
// graph, and two table summaries. The two incomes are deliberately NEVER merged
// into one "total": the 10% service fee (BR-04) is platform income and belongs to
// the admin; the remaining rental amount is owner income and is paid out to the
// car owner. This mirrors Turo's split of "Turo fee" vs "host earnings".
//
// Accounting rule used everywhere on this page:
//   renter pays     = subtotal − discountAmount + driverTotal + fee   (Booking.total)
//   owner income    = subtotal − discountAmount + driverTotal          (released to owner —
//                     the driver is the OWNER's, so the driver fee is owner income too)
//   platform income = fee                                (kept by admin — 10% of the OVERALL
//                     booking price including any owner-driver fee, FR-49)
// Only bookings whose escrow was RELEASED (paymentStatus = PAID) count as income;
// HELD money is still in escrow and is shown as its own KPI, never as income.
import Link from "next/link";
import { AutoRefresh } from "@/components/auto-refresh";
import { apiGet } from "@/lib/api";
import { requireActiveUser } from "@/lib/auth";
import { formatETB } from "@/lib/pricing";
import { AdminIncomeChart } from "@/components/admin-income-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";
export const metadata = { title: "Income dashboard" };

const MONTHS_SHOWN = 6; // trailing window shown in the graph + monthly table

/** UTC month key "YYYY-MM" — endDate is @db.Date (midnight UTC) so UTC is stable. */
function monthKey(d: Date): string {
  return d.toISOString().slice(0, 7);
}

/** "2026-10" -> "Oct 26" for chart/axis labels. */
function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-GB", { month: "short", year: "2-digit", timeZone: "UTC" });
}

export default async function AdminEarningsPage() {
  await requireActiveUser();
  const data = await apiGet<{
    released: { subtotal: number; discountAmount: number; driverTotal: number; fee: number; endDate: Date; ownerId: string; ownerName: string }[];
    held: number[];
    heldCount: number;
  }>("/api/view/admin/earnings");
  const released = data.released;
  const held = data.held.map((total) => ({ total }));

  // Trailing 6-month window (current month last), zero-filled so the timeline
  // never skips quiet months — standard for earnings dashboards.
  const now = new Date();
  const window: string[] = [];
  for (let i = MONTHS_SHOWN - 1; i >= 0; i--) {
    window.push(monthKey(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1))));
  }
  const byMonth = new Map<string, { platform: number; owner: number; trips: number }>(window.map((k) => [k, { platform: 0, owner: 0, trips: 0 }]));
  const byOwner = new Map<string, { name: string; platform: number; owner: number; trips: number }>();

  let allPlatform = 0;
  let allOwner = 0;
  let platformThisMonth = 0;
  let ownerThisMonth = 0;
  const thisMonth = monthKey(now);

  for (const b of released) {
    const ownerShare = b.subtotal - b.discountAmount + b.driverTotal;
    allPlatform += b.fee;
    allOwner += ownerShare;
    const key = monthKey(b.endDate); // income recognised in the month the trip ended
    if (key === thisMonth) {
      platformThisMonth += b.fee;
      ownerThisMonth += ownerShare;
    }
    const m = byMonth.get(key);
    if (m) {
      m.platform += b.fee;
      m.owner += ownerShare;
      m.trips += 1;
    }
    const o = byOwner.get(b.ownerId) ?? { name: b.ownerName, platform: 0, owner: 0, trips: 0 };
    o.platform += b.fee;
    o.owner += ownerShare;
    o.trips += 1;
    byOwner.set(b.ownerId, o);
  }

  const chartData = window.map((k) => ({ month: monthLabel(k), platform: byMonth.get(k)!.platform, owner: byMonth.get(k)!.owner }));
  const owners = [...byOwner.values()].sort((a, b) => b.owner - a.owner);
  const heldTotal = held.reduce((a, b) => a + b.total, 0);

  const kpis = [
    { label: "Platform income (yours)", value: formatETB(allPlatform), hint: "10% service fee on released trips — kept by the admin" },
    { label: "Owner income (payouts)", value: formatETB(allOwner), hint: "rental amount paid out to car owners — never the admin's" },
    { label: "Held in escrow", value: `${held.length} booking${held.length === 1 ? "" : "s"}`, hint: `${formatETB(heldTotal)} paid by renters, released when trips end` },
    { label: "Platform income this month", value: formatETB(platformThisMonth), hint: `owner income this month: ${formatETB(ownerThisMonth)}` },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <AutoRefresh />
      <header>
        <h1 className="text-2xl font-bold">Income dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Every released trip splits the renter&apos;s payment two ways: the <span className="font-medium text-amber-700">10% service fee (BR-04) is platform income — yours as admin</span>, and the{" "}
          <span className="font-medium text-emerald-700">remaining rental amount is owner income — paid to the car owner</span>. The two are shown side by side and never added into one total.
        </p>
      </header>

      <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardContent className="p-4">
              <dt className="text-sm text-muted-foreground">{k.label}</dt>
              <dd className="mt-1 text-xl font-bold leading-tight">{k.value}</dd>
              <p className="mt-1 text-xs text-muted-foreground">{k.hint}</p>
            </CardContent>
          </Card>
        ))}
      </dl>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Monthly income — platform vs owners (last {MONTHS_SHOWN} months, by trip end)</CardTitle>
        </CardHeader>
        <CardContent>
          <AdminIncomeChart data={chartData} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Monthly summary</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">Monthly summary: completed trips, platform income, owner income</caption>
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th scope="col" className="p-3 font-medium">Month</th>
                  <th scope="col" className="p-3 text-right font-medium">Released trips</th>
                  <th scope="col" className="p-3 text-right font-medium">Platform income</th>
                  <th scope="col" className="p-3 text-right font-medium">Owner income</th>
                </tr>
              </thead>
              <tbody>
                {window.map((k) => {
                  const m = byMonth.get(k)!;
                  return (
                    <tr key={k} className="border-b last:border-0">
                      <td className="p-3 font-medium">{monthLabel(k)}</td>
                      <td className="p-3 text-right">{m.trips}</td>
                      <td className="p-3 text-right font-semibold text-amber-700">{formatETB(m.platform)}</td>
                      <td className="p-3 text-right font-semibold text-emerald-700">{formatETB(m.owner)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t bg-muted/40 text-sm font-bold">
                  <td className="p-3">All time</td>
                  <td className="p-3 text-right">{released.length}</td>
                  <td className="p-3 text-right text-amber-700">{formatETB(allPlatform)}</td>
                  <td className="p-3 text-right text-emerald-700">{formatETB(allOwner)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Summary by owner (renter income)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {owners.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              No released payments yet. Income appears here once owners confirm payment and trips complete — see <Link href="/admin/bookings?payment=held" className="text-brand hover:underline">bookings held in escrow</Link>.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <caption className="sr-only">Income per owner: trips, platform income, owner income</caption>
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th scope="col" className="p-3 font-medium">Owner</th>
                    <th scope="col" className="p-3 text-right font-medium">Released trips</th>
                    <th scope="col" className="p-3 text-right font-medium">Platform income</th>
                    <th scope="col" className="p-3 text-right font-medium">Owner income</th>
                  </tr>
                </thead>
                <tbody>
                  {owners.map((o) => (
                    <tr key={o.name} className="border-b last:border-0">
                      <td className="p-3 font-medium">{o.name}</td>
                      <td className="p-3 text-right">{o.trips}</td>
                      <td className="p-3 text-right text-amber-700">{formatETB(o.platform)}</td>
                      <td className="p-3 text-right font-semibold text-emerald-700">{formatETB(o.owner)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        <Link href="/admin" className="text-brand hover:underline">← Admin console</Link>
      </p>
    </div>
  );
}
