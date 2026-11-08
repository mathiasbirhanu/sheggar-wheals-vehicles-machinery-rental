// Renter dashboard (FR-26): next trip, counts, spend, announcements, quick links.
import Link from "next/link";
import { apiGet } from "@/lib/api";
import { requireActiveUser } from "@/lib/auth";
import { formatETB, formatDate } from "@/lib/pricing";
import { BookingStatusBadge } from "@/components/status-badges";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Megaphone, CalendarPlus, Wallet } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "My Bookings" };

export default async function DashboardPage() {
  const user = await requireActiveUser();
  const { bookings, announcement } = await apiGet<{
    bookings: import("@/lib/domain").Booking[];
    announcement: import("@/lib/domain").Announcement | null;
  }>("/api/view/dashboard");

  const now = new Date();
  const next = bookings.filter((b) => ["REQUESTED", "CONFIRMED", "IN_PROGRESS"].includes(b.status) && b.endDate.getTime() >= now.getTime()).sort((a, b) => a.startDate.getTime() - b.startDate.getTime())[0];
  const upcoming = bookings.filter((b) => ["REQUESTED", "CONFIRMED"].includes(b.status)).length;
  const inProgress = bookings.filter((b) => b.status === "IN_PROGRESS").length;
  const past = bookings.filter((b) => ["COMPLETED", "REVIEWED", "RESOLVED"].includes(b.status)).length;
  const cancelled = bookings.filter((b) => ["CANCELLED", "DECLINED"].includes(b.status)).length;
  const spend = bookings.filter((b) => ["COMPLETED", "REVIEWED", "RESOLVED"].includes(b.status)).reduce((a, b) => a + b.total, 0);

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">My Bookings</h1>
          <p className="text-sm text-muted-foreground">Welcome back, {user.name.split(" ")[0]} — your renting activity at a glance.</p>
        </div>
        <Button asChild className="bg-brand text-brand-foreground hover:bg-brand/90"><Link href="/cars"><CalendarPlus className="mr-2 h-4 w-4" /> Book a car</Link></Button>
      </header>

      {announcement && (
        <div className="flex items-start gap-2 rounded-lg border border-brand/25 bg-brand/10 p-4 text-sm text-foreground/90">
          <Megaphone className="mt-0.5 h-4 w-4 shrink-0" />
          <p><strong>{announcement.title}:</strong> {announcement.body}</p>
        </div>
      )}

      {next && (
        <Card className="border-brand/30">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold uppercase tracking-wide text-brand">Your next trip</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold">{next.car.make} {next.car.model} · {formatDate(next.startDate)} → {formatDate(next.endDate)}</p>
              <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">Status: <BookingStatusBadge status={next.status} /></p>
            </div>
            <Button asChild size="sm" variant="secondary"><Link href={"/bookings/" + next.id}>Manage</Link></Button>
          </CardContent>
        </Card>
      )}

      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          ["Upcoming", upcoming], ["In progress", inProgress], ["Past trips", past], ["Cancelled / declined", cancelled],
        ].map(([label, value]) => (
          <Card key={label as string}>
            <CardContent className="p-4">
              <dt className="text-sm text-muted-foreground">{label}</dt>
              <dd className="text-2xl font-bold">{value}</dd>
            </CardContent>
          </Card>
        ))}
      </dl>

      <Card>
        <CardContent className="flex items-center gap-3 p-4">
          <Wallet className="h-8 w-8 text-brand" aria-hidden />
          <div>
            <p className="text-sm text-muted-foreground">Total demo spend on completed trips</p>
            <p className="text-xl font-bold">{formatETB(spend)}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Recent bookings</CardTitle></CardHeader>
        <CardContent>
          {bookings.length === 0 ? (
            <p className="text-sm text-muted-foreground">No bookings yet. <Link href="/cars" className="text-brand hover:underline">Find your first car →</Link></p>
          ) : (
            <ul className="divide-y">
              {bookings.slice(0, 5).map((b) => (
                <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                  <Link href={"/bookings/" + b.id} className="font-medium hover:underline">{b.car.make} {b.car.model}</Link>
                  <span className="text-muted-foreground">{formatDate(b.startDate)} → {formatDate(b.endDate)}</span>
                  <BookingStatusBadge status={b.status} />
                </li>
              ))}
            </ul>
          )}
          {user.roles.includes("OWNER") && (
            <p className="mt-4 text-sm">You are also an owner — <Link href="/owner" className="font-medium text-brand hover:underline">open the owner hub →</Link></p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
