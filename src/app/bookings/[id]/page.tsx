// Booking detail (FR-28): lifecycle actions per user, receipt, review, dispute, simulated tracking.
import Link from "next/link";
import { notFound } from "next/navigation";
import { AutoRefresh } from "@/components/auto-refresh";
import { apiGetOr404 } from "@/lib/api";
import { requireActiveUser } from "@/lib/auth";
import { canTransition } from "@/lib/bookings";
import { formatETB, formatDate, formatDateTime } from "@/lib/pricing";
import { BookingStatusBadge, PaymentStatusBadge, LicenseStatusBadge, DriveModeBadge } from "@/components/status-badges";
import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/submit-button";
import { CarImage } from "@/components/car-image";
import { TripTracking } from "@/components/trip-tracking";
import { cancelBookingAction, approveBookingAction, declineBookingAction, startTripAction, completeTripAction, openDisputeAction } from "@/actions/bookings";
import { createReviewAction } from "@/actions/platform";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Star, Scale, BadgeCheck, CheckCircle2, IdCard } from "lucide-react";
import { BookingStatus } from "@/lib/domain";

export const dynamic = "force-dynamic";

const STEPS: BookingStatus[] = ["REQUESTED", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "REVIEWED"];
const DISPUTABLE: BookingStatus[] = [BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS, BookingStatus.COMPLETED, BookingStatus.REVIEWED];

export default async function BookingDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ paid?: string }> }) {
  const { id } = await params;
  const { paid } = await searchParams;
  const user = await requireActiveUser();
  const data = await apiGetOr404<{
    booking: import("@/lib/domain").Booking;
    dispute: import("@/lib/domain").Dispute | null;
    isRenter: boolean;
    isOwner: boolean;
  }>(`/api/view/bookings/${id}`);
  const booking = data.booking;
  const dispute = data.dispute;
  const isRenter = data.isRenter;
  const isOwner = data.isOwner;

  const status = booking.status;
  const idx = STEPS.indexOf(status);
  const timeline = status === "DISPUTED" || status === "RESOLVED" || status === "DECLINED" || status === "CANCELLED" ? null : STEPS.map((s, i) => ({ s, done: idx >= i && idx !== -1 }));

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <AutoRefresh />
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground"><Link href="/bookings" className="hover:text-foreground">My bookings</Link> <span aria-hidden>/</span> {booking.car.make} {booking.car.model}</nav>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{booking.car.make} {booking.car.model} <span className="font-normal text-muted-foreground">{booking.car.year}</span></h1>
          <p className="text-sm text-muted-foreground">{formatDate(booking.startDate)} → {formatDate(booking.endDate)} · {booking.days} day{booking.days > 1 ? "s" : ""} · {booking.car.neighbourhood}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <BookingStatusBadge status={status} />
          <PaymentStatusBadge status={booking.paymentStatus} />
          <DriveModeBadge mode={booking.driveMode} />
        </div>
      </header>

      {/* Success moment (FR-24): shown once after checkout redirects back with ?paid=1. */}
      {paid === "1" && booking.paymentStatus === "HELD" && (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-300 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950" role="status">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
          <div className="text-sm">
            <p className="font-semibold text-emerald-800 dark:text-emerald-200">Payment successful — {formatETB(booking.total)} held in escrow</p>
            <p className="text-emerald-800/85 dark:text-emerald-300/85">
              Paid via {booking.paymentMethod ?? "demo TeleBirr"} · Ref {booking.paymentRef}. {booking.owner.name} and the platform admins were notified. The money is released to the owner only after the trip completes — no real money moves in this demo (BR-12).
            </p>
          </div>
        </div>
      )}

      {(status === "DISPUTED" || status === "RESOLVED" || status === "DECLINED" || status === "CANCELLED") && (
        <div className={`rounded-lg border p-4 text-sm ${status === "DISPUTED" ? "border-orange-300 bg-orange-50 dark:border-orange-900 dark:bg-orange-950" : status === "RESOLVED" ? "border-emerald-300 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950" : "border-stone-300 bg-stone-100 dark:border-stone-800 dark:bg-stone-900"}`}>
          {status === "DISPUTED" && <p><strong>Dispute open (BR-07).</strong> {dispute?.reason}</p>}
          {status === "RESOLVED" && <p><strong>Dispute resolved (BR-07).</strong> {dispute?.resolutionNotes ?? "The dispute was resolved and the booking restored."}</p>}
          {status === "DECLINED" && <p><strong>Request declined.</strong> {booking.licenseStatus === "REJECTED" ? "The submitted driving licence was rejected." : ""} {booking.licenseDecisionNote ? `Owner's reason: ${booking.licenseDecisionNote}` : "No payment was taken."}</p>}
          {status === "CANCELLED" && <p>This booking was cancelled.{booking.paymentStatus === "REFUNDED" ? " The held payment was refunded (demo)." : ""}</p>}
        </div>
      )}

      {timeline && (
        <ol className="flex flex-wrap gap-2" aria-label="Trip progress">
          {timeline.map(({ s, done }, i) => (
            <li key={s} className="flex items-center gap-2">
              <span className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${done ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200" : "bg-muted text-muted-foreground"}`}>
                {done && <BadgeCheck className="h-3.5 w-3.5" aria-hidden />} {s.replace("_", " ").toLowerCase()}
              </span>
              {i < timeline.length - 1 && <span aria-hidden className="text-muted-foreground">→</span>}
            </li>
          ))}
        </ol>
      )}

      <div className="grid gap-6 md:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          {/* Licence covering whoever drives (FR-49, Turo-style): the licence travels
              WITH the request — SELF_DRIVE → the renter's own; OWN_DRIVER → the brought
              driver's — and the car OWNER decides it together with the booking;
              OWNER_DRIVER → none needed. */}
          {booking.driveMode !== "OWNER_DRIVER" && (booking.licenseNumber || booking.licenseImage) && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><IdCard className="h-4 w-4 text-brand" aria-hidden /> {booking.driveMode === "OWN_DRIVER" ? "Driver's licence" : "Renter's driving licence"}</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex flex-wrap items-center gap-3">
                  {booking.licenseImage && (
                    <a href={booking.licenseImage} target="_blank" rel="noopener noreferrer" title="Open the licence photo full size">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={booking.licenseImage} alt="Driving licence submitted with this request" className="h-24 w-32 max-w-full cursor-zoom-in rounded-md border object-cover" />
                    </a>
                  )}
                  <div className="space-y-1">
                    <p><span className="text-muted-foreground">Number:</span> <span className="font-mono font-medium">{booking.licenseNumber ?? "—"}</span></p>
                    <p className="text-xs text-muted-foreground">
                      {booking.driveMode === "OWN_DRIVER"
                        ? `For ${booking.driverName ?? "the driver"} — brought by ${booking.renter.name} with the request.`
                        : `Submitted by ${booking.renter.name} with the request — the owner approves it together with the booking.`}
                    </p>
                    <LicenseStatusBadge status={booking.licenseStatus} />
                    {booking.licenseDecisionNote && <p className="text-xs text-muted-foreground">Owner&apos;s note: {booking.licenseDecisionNote}</p>}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Private to the renter, the car owner, and platform admins.</p>
              </CardContent>
            </Card>
          )}
          {booking.driveMode === "OWNER_DRIVER" && (
            <Card>
              <CardContent className="flex items-center gap-3 p-4 text-sm text-muted-foreground">
                <IdCard className="h-4 w-4 text-brand" aria-hidden />
                Driven by the owner&apos;s professional driver — no licence review needed.
              </CardContent>
            </Card>
          )}

          {/* Actions per lifecycle (FR-28) */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Actions</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {isOwner && canTransition(status, BookingStatus.CONFIRMED) && (
                <div className="flex flex-wrap gap-2">
                  <ActionForm action={approveBookingAction}><input type="hidden" name="bookingId" value={booking.id} /><SubmitButton size="sm" className="bg-brand text-brand-foreground hover:bg-brand/90">Approve</SubmitButton></ActionForm>
                  <ActionForm action={declineBookingAction}><input type="hidden" name="bookingId" value={booking.id} /><SubmitButton size="sm" variant="outline">Decline</SubmitButton></ActionForm>
                </div>
              )}
              {isOwner && canTransition(status, BookingStatus.IN_PROGRESS) && (
                <ActionForm action={startTripAction}><input type="hidden" name="bookingId" value={booking.id} /><SubmitButton size="sm">Mark picked up (start trip)</SubmitButton></ActionForm>
              )}
              {isOwner && canTransition(status, BookingStatus.COMPLETED) && (
                <ActionForm action={completeTripAction}><input type="hidden" name="bookingId" value={booking.id} /><SubmitButton size="sm" className="bg-brand text-brand-foreground hover:bg-brand/90">Mark returned (complete trip)</SubmitButton></ActionForm>
              )}
              {isRenter && canTransition(status, BookingStatus.CANCELLED) && (
                <ActionForm action={cancelBookingAction}><input type="hidden" name="bookingId" value={booking.id} /><SubmitButton size="sm" variant="outline">Cancel booking</SubmitButton></ActionForm>
              )}
              {isRenter && status === BookingStatus.CONFIRMED && booking.paymentStatus === "UNPAID" && (
                <Button asChild size="sm" className="bg-brand text-brand-foreground hover:bg-brand/90"><Link href={"/checkout/" + booking.id}>Pay now — escrow protected</Link></Button>
              )}
              {(isRenter || isOwner) && DISPUTABLE.includes(status) && (
                <ActionForm action={openDisputeAction} className="space-y-2 rounded-lg border border-dashed p-3">
                  <input type="hidden" name="bookingId" value={booking.id} />
                  <Label htmlFor="reason" className="flex items-center gap-1.5 text-sm"><Scale className="h-4 w-4" /> Open a dispute (admin will resolve)</Label>
                  <Textarea id="reason" name="reason" placeholder="Explain the issue — e.g. late return, damage disagreement…" rows={2} required minLength={15} />
                  <SubmitButton size="sm" variant="outline">Open dispute</SubmitButton>
                </ActionForm>
              )}
              {!isOwner && !isRenter && <p className="text-sm text-muted-foreground">View-only (admin).</p>}
              {isOwner && status === BookingStatus.REQUESTED && <p className="text-xs text-muted-foreground">Approving re-checks calendar conflicts server-side (BR-05).</p>}
            </CardContent>
          </Card>

          {/* Simulated trip tracking (FR-22): full map + moving car marker. Live during
              IN_PROGRESS, replayable after completion — same simulated route, BR-12. */}
          {(status === BookingStatus.IN_PROGRESS || status === BookingStatus.COMPLETED || status === BookingStatus.REVIEWED) && (
            <TripTracking
              carLabel={`${booking.car.make} ${booking.car.model}`}
              carLat={booking.car.lat}
              carLng={booking.car.lng}
              startIso={booking.startDate.toISOString()}
              endIso={booking.endDate.toISOString()}
              status={status}
            />
          )}

          {/* Review (FR-29..31) */}
          {isRenter && status === BookingStatus.COMPLETED && !booking.review && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Leave a review</CardTitle></CardHeader>
              <CardContent>
                <ActionForm action={createReviewAction} className="space-y-3">
                  <input type="hidden" name="bookingId" value={booking.id} />
                  <div className="space-y-1.5">
                    <Label htmlFor="rating">Rating</Label>
                    <Select name="rating" defaultValue="5">
                      <SelectTrigger id="rating" className="w-40"><SelectValue /></SelectTrigger>
                      <SelectContent>{[5, 4, 3, 2, 1].map((n) => <SelectItem key={n} value={String(n)}>{n} star{n > 1 ? "s" : ""}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="comment">Your experience</Label>
                    <Textarea id="comment" name="comment" rows={3} placeholder="How was the car, the handover, the owner?" required minLength={5} />
                  </div>
                  <SubmitButton size="sm" className="bg-brand text-brand-foreground hover:bg-brand/90">Publish review</SubmitButton>
                </ActionForm>
              </CardContent>
            </Card>
          )}
          {booking.review && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><Star className="h-4 w-4 fill-amber-400 text-amber-400" /> Review</CardTitle></CardHeader>
              <CardContent className="text-sm">
                <p aria-label={`${booking.review.rating} of 5`}>{Array.from({ length: 5 }, (_, i) => <Star key={i} className={`inline h-4 w-4 ${i < booking.review!.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} aria-hidden />)}</p>
                <p className="mt-2 text-muted-foreground">{booking.review.comment}</p>
                {booking.review.ownerReply && <div className="mt-3 rounded-md bg-muted p-3"><p className="text-xs font-semibold text-muted-foreground">Owner reply:</p><p className="mt-0.5">{booking.review.ownerReply}</p></div>}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Receipt (FR-25) */}
        <aside className="space-y-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Receipt</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex gap-3">
                <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-md"><CarImage src={booking.car.photos[0]} alt={`${booking.car.make} ${booking.car.model}`} className="absolute inset-0 h-full w-full" /></div>
                <div className="text-sm">
                  <Link href={"/cars/" + booking.car.id} className="font-medium hover:underline">{booking.car.make} {booking.car.model}</Link>
                  <p className="text-muted-foreground">{booking.car.neighbourhood}</p>
                </div>
              </div>
              <Separator />
              <p className="flex justify-between"><span>Renter</span><span>{booking.renter.name}</span></p>
              <p className="flex justify-between"><span>Owner</span><span>{booking.owner.name}</span></p>
              <Separator />
              <p className="flex justify-between"><span>{booking.days} day{booking.days > 1 ? "s" : ""} × {formatETB(booking.pricePerDay)}</span><span>{formatETB(booking.subtotal)}</span></p>
              {booking.discountAmount > 0 && (
                <p className="flex items-center justify-between font-medium text-brand">
                  <span className="flex items-center gap-1.5">
                    <span className="rounded-full bg-brand px-1.5 py-0.5 text-[10px] font-extrabold text-brand-foreground">−{booking.discountPercent}%</span>
                    Offer discount
                  </span>
                  <span>−{formatETB(booking.discountAmount)}</span>
                </p>
              )}
              {booking.driverTotal > 0 && (
                <p className="flex justify-between"><span>Owner&apos;s driver · {booking.days} day{booking.days > 1 ? "s" : ""} × {formatETB(booking.driverFeePerDay)}</span><span>{formatETB(booking.driverTotal)}</span></p>
              )}
              <p className="flex justify-between text-muted-foreground"><span>Platform fee</span><span>{formatETB(booking.fee)}</span></p>
              <p className="flex justify-between text-base font-bold"><span>Total (snapshot)</span><span>{formatETB(booking.total)}</span></p>
              {booking.paymentRef && <p className="text-xs text-muted-foreground">Ref: {booking.paymentRef} · {booking.paymentMethod ?? "demo TeleBirr"} (FR-24)</p>}
              <p className="text-xs text-muted-foreground">Created {formatDateTime(booking.createdAt)}</p>
              {/* FR-51 clickwrap proof: which terms the renter signed, and when. */}
              {booking.termsVersion && (
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Scale className="h-3.5 w-3.5 shrink-0 text-brand" aria-hidden />Rental rules {booking.termsVersion} · agreed {booking.termsAgreedAt ? formatDateTime(booking.termsAgreedAt) : "—"}</p>
              )}
              {booking.paymentTermsVersion && (
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Scale className="h-3.5 w-3.5 shrink-0 text-brand" aria-hidden />Payment terms {booking.paymentTermsVersion} · agreed {booking.paymentTermsAgreedAt ? formatDateTime(booking.paymentTermsAgreedAt) : "—"}</p>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
