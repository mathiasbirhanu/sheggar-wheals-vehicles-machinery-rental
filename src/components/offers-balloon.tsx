"use client";
// Floating "live offers" balloon — the ONLY new client JS on the home page.
// The bounce is a transform-only keyframe (GPU); the panel is plain DOM toggling.
import { useState } from "react";
import Link from "next/link";
import { Percent, Tag, X } from "lucide-react";
import { formatDate } from "@/lib/pricing";

export type OfferItem = {
  id: string;
  title: string;
  body: string;
  discountPercent: number | null;
  validUntil: Date | null;
  carId?: string | null; // set = the offer applies to this car (badge + voucher maths)
};

export function OffersBalloon({ offers }: { offers: OfferItem[] }) {
  const [open, setOpen] = useState(false);
  if (offers.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-40 print:hidden">
      {open && (
        <div
          role="dialog"
          aria-label="Live discount offers"
          className="absolute bottom-16 right-0 w-80 overflow-hidden rounded-2xl border bg-card shadow-2xl shadow-brand/25"
        >
          <div className="flex items-center justify-between border-b bg-brand/10 px-4 py-2.5">
            <p className="flex items-center gap-1.5 text-sm font-bold text-brand">
              <Tag className="h-4 w-4" aria-hidden /> Live offers
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close offers"
              className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
          <ul className="max-h-80 divide-y overflow-y-auto">
            {offers.map((o) => (
              <li key={o.id} className="flex gap-3 p-3.5">
                <span
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand text-sm font-extrabold text-brand-foreground shadow-md shadow-brand/30"
                  aria-label={`${o.discountPercent} percent off`}
                >
                  −{o.discountPercent}%
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-snug">{o.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{o.body}</p>
                  {o.validUntil && (
                    <p className="mt-1 text-[11px] font-medium text-brand">ends {formatDate(o.validUntil)}</p>
                  )}
                  {o.carId && (
                    <Link
                      href={`/cars/${o.carId}`}
                      onClick={() => setOpen(false)}
                      className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-brand underline-offset-2 hover:underline"
                    >
                      See the car & book →
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <Link
            href="/cars"
            onClick={() => setOpen(false)}
            className="block bg-brand px-4 py-2.5 text-center text-sm font-semibold text-brand-foreground transition-colors hover:bg-brand/90"
          >
            Browse cars with offers →
          </Link>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? "Hide live offers" : "Show live discount offers"}
        className="animate-balloon relative grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-brand to-brand/70 text-brand-foreground shadow-xl shadow-brand/40 transition-transform hover:scale-105"
      >
        <Percent className="h-6 w-6" aria-hidden />
        {/* balloon knot + string hint */}
        <span className="absolute -bottom-1 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 rounded-[2px] bg-brand/70" aria-hidden />
        {offers.length > 1 && (
          <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-foreground px-1 text-[10px] font-bold text-background">
            {offers.length}
          </span>
        )}
      </button>
    </div>
  );
}
