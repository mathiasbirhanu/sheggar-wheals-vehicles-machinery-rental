// Multi-method demo checkout (FR-23/24, BR-04, BR-12): snapshot totals, escrow
// explainer, and the Turo-style off-platform warning. Method cards come from
// lib/payments.ts via the client picker; the total is read from the booking
// row (server-side authority) — the client never sends an amount.
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { apiGetOr404 } from "@/lib/api";
import { requireActiveUser } from "@/lib/auth";
import { formatETB, formatDate } from "@/lib/pricing";
import { payBookingAction } from "@/actions/bookings";
import { ActionForm } from "@/components/action-form";
import { PaymentTermsButton } from "@/components/payment-terms-button";
import { PaymentMethodPicker } from "@/components/payment-method-picker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, Lock, KeyRound, ShieldCheck, ShieldAlert } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Checkout" };

const ESCROW_STEPS = [
  { icon: CreditCard, label: "You pay" },
  { icon: Lock, label: "We hold it" },
  { icon: KeyRound, label: "Owner paid after the trip" },
];

export default async function CheckoutPage({ params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await params;
  const user = await requireActiveUser();
  const data = await apiGetOr404<{ booking: import("@/lib/domain").Booking }>(`/api/view/checkout/${bookingId}`);
  const booking = data.booking;
  if (booking.status !== "CONFIRMED" || booking.paymentStatus !== "UNPAID") redirect("/bookings/" + bookingId);

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Secure checkout
            <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">Demo payment</span>
          </CardTitle>
          <p className="text-sm text-muted-foreground">Paying for your {booking.car.make} {booking.car.model} trip, {formatDate(booking.startDate)} → {formatDate(booking.endDate)}.</p>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-1 rounded-lg border bg-muted/40 p-4 text-sm">
            <p className="flex justify-between"><span>Subtotal — {booking.days} day{booking.days > 1 ? "s" : ""} × {formatETB(booking.pricePerDay)}</span><span>{formatETB(booking.subtotal)}</span></p>
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
            <p className="flex justify-between border-t pt-1 text-base font-bold"><span>Total due now</span><span>{formatETB(booking.total)}</span></p>
            <p className="pt-1 text-xs text-muted-foreground">Snapshot taken when you requested the booking — it cannot change (BR-03, BR-04).</p>
          </div>

          <ActionForm action={payBookingAction} className="space-y-4" id="checkout-form">
            <input type="hidden" name="bookingId" value={booking.id} />
            <PaymentMethodPicker userPhone={user.phone ?? ""} />
            <PaymentTermsButton total={formatETB(booking.total)} />
          </ActionForm>

          <ol className="grid grid-cols-3 gap-2 rounded-lg border bg-muted/40 p-3 text-center text-[11px] font-medium leading-tight text-muted-foreground">
            {ESCROW_STEPS.map((s, i) => (
              <li key={s.label} className="space-y-1">
                <s.icon className="mx-auto h-4 w-4 text-brand" aria-hidden />
                <span>{i + 1}. {s.label}</span>
              </li>
            ))}
          </ol>

          <div className="flex items-start gap-2 rounded-lg border border-brand/25 bg-brand/10 p-3 text-xs text-foreground/90">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
            <p>Your money is <strong>held in escrow</strong> until the owner marks the trip complete — only then is it released. Cancel before the trip starts and a held payment is refunded. This is a <strong>demo payment</strong>: no real money moves (BR-12).</p>
          </div>
          <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <p>Pay only inside Sheggar Wheels. Cash or direct transfers to owners are <strong>not protected</strong> by escrow or dispute resolution.</p>
          </div>
          <p className="text-center text-sm"><Link href="/bookings" className="text-muted-foreground underline-offset-4 hover:underline">Cancel and go back</Link></p>
        </CardContent>
      </Card>
    </div>
  );
}
