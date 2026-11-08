// Platform report (FR-44): metrics + CSV export.
import Link from "next/link";
import { apiGet } from "@/lib/api";
import { requireActiveUser } from "@/lib/auth";
import { formatETB } from "@/lib/pricing";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { BookingStatus } from "@/lib/domain";

export const dynamic = "force-dynamic";
export const metadata = { title: "Platform report" };

export default async function AdminReportsPage() {
  await requireActiveUser();
  const data = await apiGet<{
    users: number; cars: number; pending: number; bookings: number;
    byStatus: { status: string; count: number }[];
    completed: { subtotal: number; fee: number; total: number }[];
    utilised: number;
  }>("/api/view/admin/reports");
  const { users, cars, pending, bookings, completed } = data;
  const byStatus = data.byStatus.map((row) => ({ status: row.status as BookingStatus, _count: { _all: row.count } }));
  const gmv = completed.reduce((a, b) => a + b.total, 0);
  const revenue = completed.reduce((a, b) => a + b.fee, 0);
  const utilised = data.utilised;

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Platform report</h1>
        <Button asChild variant="outline" size="sm"><a href="/api/export/admin-report" download><Download className="mr-2 h-4 w-4" /> Export CSV</a></Button>
      </header>

      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          ["Users", users], ["Listings", cars], ["Pending moderation", pending], ["Utilised listings", utilised],
          ["Bookings", bookings], ["Completed GMV", formatETB(gmv)], ["Platform revenue (fees)", formatETB(revenue)], ["Avg fee per completed trip", completed.length ? formatETB(Math.round(revenue / completed.length)) : formatETB(0)],
        ].map(([label, value]) => (
          <Card key={label as string}>
            <CardContent className="p-4">
              <dt className="text-sm text-muted-foreground">{label}</dt>
              <dd className="text-lg font-bold leading-tight">{value}</dd>
            </CardContent>
          </Card>
        ))}
      </dl>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Bookings by status</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">Booking counts by lifecycle status</caption>
              <thead><tr className="border-b text-left text-muted-foreground"><th scope="col" className="p-3 font-medium">Status</th><th scope="col" className="p-3 text-right font-medium">Count</th></tr></thead>
              <tbody>
                {byStatus.map((row) => (
                  <tr key={row.status} className="border-b last:border-0"><td className="p-3">{row.status.replace(/_/g, " ").toLowerCase()}</td><td className="p-3 text-right font-semibold">{row._count._all}</td></tr>
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
