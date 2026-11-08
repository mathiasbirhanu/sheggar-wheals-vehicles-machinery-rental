// Owner overview (FR-36/37): stats, pending requests, quick links.
import Link from "next/link";
import { AutoRefresh } from "@/components/auto-refresh";
import { apiGet } from "@/lib/api";
import { requireActiveUser } from "@/lib/auth";
import { formatETB, formatDate } from "@/lib/pricing";
import { createOwnerAnnouncementAction } from "@/actions/announcements";
import { BookingStatusBadge, LicenseStatusBadge } from "@/components/status-badges";
import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/submit-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CarFront, Inbox, Megaphone, TrendingUp, Wallet, Plus } from "lucide-react";
import type { Car, Booking } from "@/lib/domain";

export const dynamic = "force-dynamic";
export const metadata = { title: "Owner hub" };

export default async function OwnerPage() {
  const user = await requireActiveUser();
  const { cars, requests, confirmed, released } = await apiGet<{
    cars: Car[];
    requests: Booking[];
    confirmed: number;
    released: number;
  }>("/api/view/owner");
  void user;

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <AutoRefresh />
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Owner hub</h1>
          <p className="text-sm text-muted-foreground">Manage listings, respond to requests, and track earnings.</p>
        </div>
        <Button asChild className="bg-brand text-brand-foreground hover:bg-brand/90"><Link href="/owner/cars/new"><Plus className="mr-2 h-4 w-4" /> List a car</Link></Button>
      </header>

      <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { icon: CarFront, label: "My cars", value: cars.length },
          { icon: Inbox, label: "Pending requests", value: requests.length },
          { icon: TrendingUp, label: "Confirmed / active", value: confirmed },
          { icon: Wallet, label: "Released earnings", value: formatETB(released) },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center gap-3 p-4">
              <s.icon className="h-8 w-8 text-brand" aria-hidden />
              <div>
                <dt className="text-sm text-muted-foreground">{s.label}</dt>
                <dd className="text-lg font-bold leading-tight">{s.value}</dd>
              </div>
            </CardContent>
          </Card>
        ))}
      </dl>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Requests awaiting your decision</CardTitle></CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending requests right now.</p>
          ) : (
            <ul className="divide-y">
              {requests.map((b) => (
                <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                  <span className="font-medium">{b.renter.name} → {b.car.make} {b.car.model}</span>
                  <span className="text-muted-foreground">{formatDate(b.startDate)} → {formatDate(b.endDate)}</span>
                  <div className="flex flex-wrap items-center gap-2"><BookingStatusBadge status={b.status} /><LicenseStatusBadge status={b.licenseStatus} /><Button asChild size="sm" variant="secondary"><Link href={"/owner/cars/" + b.carId + "/bookings"}>Review licence</Link></Button></div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base"><Megaphone className="h-4 w-4 text-brand" /> Announce an event or discount</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-sm text-muted-foreground">
            Approved announcements run on the home banner and offers balloon. Every submission is reviewed by an admin first (moderation gate, BR-02).
          </p>
          <ActionForm action={createOwnerAnnouncementAction} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
              <div className="space-y-1.5">
                <Label htmlFor="kind">Type</Label>
                <select id="kind" name="kind" defaultValue="EVENT" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="EVENT">Event</option>
                  <option value="DISCOUNT">Discount</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="title">Title</Label>
                <Input id="title" name="title" required minLength={4} maxLength={120} placeholder="e.g. Weekend flash: 15% off SUVs" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="body">Description & rules</Label>
              <Textarea id="body" name="body" rows={3} required minLength={10} maxLength={400} placeholder="Discounts: write the rules — who qualifies, minimum days, restrictions. Events: where, when, what to expect." />
            </div>
            <details className="rounded-lg border p-3 text-sm">
              <summary className="cursor-pointer font-medium text-muted-foreground">It&apos;s a discount? Pick the car, percent and end date</summary>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="carId">Which car gets the offer?</Label>
                  <select id="carId" name="carId" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" defaultValue="">
                    <option value="" disabled>Choose one of your cars…</option>
                    {cars.map((c) => <option key={c.id} value={c.id}>{c.make} {c.model} ({c.year}) — {c.neighbourhood}</option>)}
                  </select>
                  <p className="text-xs text-muted-foreground">The −% badge appears on that car&apos;s card and the maths applies to its bookings.</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="discountPercent">Discount percent (5-70)</Label>
                  <Input id="discountPercent" name="discountPercent" type="number" min={5} max={70} step={1} placeholder="15" />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="validUntil">Runs until (optional)</Label>
                  <Input id="validUntil" name="validUntil" type="date" />
                </div>
              </div>
            </details>
            <SubmitButton size="sm" className="bg-brand text-brand-foreground hover:bg-brand/90">Submit for approval</SubmitButton>
          </ActionForm>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { href: "/owner/cars", label: "My listings", body: "Edit cars, manage availability, view per-car bookings." },
          { href: "/owner/earnings", label: "Earnings", body: "Monthly chart, per-car summary, and CSV export (FR-37)." },
          { href: "/owner/reviews", label: "Reviews", body: "See guest reviews of your cars and reply once to each." },
        ].map((c) => (
          <Link key={c.href} href={c.href} className="rounded-xl border p-4 transition-colors hover:border-brand/50 hover:bg-muted/30">
            <p className="font-semibold">{c.label}</p>
            <p className="mt-1 text-sm text-muted-foreground">{c.body}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
