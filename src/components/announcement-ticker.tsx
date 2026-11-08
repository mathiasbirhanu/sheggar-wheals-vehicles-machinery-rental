// Events & offers ticker (home banner) — server component, animation is pure CSS.
// The track holds the list twice; `translateX(-50%)` loops it seamlessly.
// Performance: transform-only keyframes (GPU), pauses on hover, honours reduced motion.
import Link from "next/link";
import type { CSSProperties } from "react";
import { CalendarDays, Megaphone, Percent } from "lucide-react";
import { formatDate } from "@/lib/pricing";
import type { AnnouncementKind } from "@/lib/domain";

export type TickerItem = {
  id: string;
  title: string;
  kind: AnnouncementKind;
  discountPercent: number | null;
  validUntil: Date | null;
};

function Row({ items, hidden }: { items: TickerItem[]; hidden?: boolean }) {
  return (
    <div className="flex shrink-0 items-center gap-10 pr-10" aria-hidden={hidden}>
      {items.map((a) => (
        <Link
          key={a.id}
          href="/cars"
          tabIndex={hidden ? -1 : 0}
          className="inline-flex items-center gap-2 whitespace-nowrap text-xs font-medium text-brand-foreground/90 transition-colors hover:text-brand-foreground"
        >
          {a.kind === "DISCOUNT" ? (
            <Percent className="h-3.5 w-3.5" aria-hidden />
          ) : a.kind === "EVENT" ? (
            <CalendarDays className="h-3.5 w-3.5" aria-hidden />
          ) : (
            <Megaphone className="h-3.5 w-3.5" aria-hidden />
          )}
          <span className="font-semibold">{a.title}</span>
          {a.kind === "DISCOUNT" && a.discountPercent ? (
            <span className="rounded-full bg-brand-foreground/20 px-1.5 py-0.5 text-[10px] font-bold text-brand-foreground">−{a.discountPercent}%</span>
          ) : null}
          {a.validUntil ? <span className="text-[10px] opacity-70">until {formatDate(a.validUntil)}</span> : null}
        </Link>
      ))}
    </div>
  );
}

export function AnnouncementTicker({ items }: { items: TickerItem[] }) {
  if (items.length === 0) return null;
  return (
    <section aria-label="Events and offers" className="relative overflow-hidden bg-gradient-to-r from-brand via-brand to-brand/80 text-brand-foreground shadow-sm">
      <div
        className="animate-marquee flex w-max py-2 hover:[animation-play-state:paused]"
        style={{ "--marquee-duration": `${Math.max(24, items.length * 9)}s` } as CSSProperties}
      >
        <Row items={items} />
        <Row items={items} hidden />
      </div>
    </section>
  );
}
