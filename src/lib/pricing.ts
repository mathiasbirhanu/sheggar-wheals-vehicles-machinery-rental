// Pricing and date rules (SRS FR-18, BR-03, BR-04) — pure functions, no side effects.
export const PLATFORM_FEE_RATE = 0.1; // BR-04: demo platform fee, shown before confirmation

/** Inclusive rental days: same-day return counts as 1 day. */
export function daysInclusive(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime();
  return Math.round(ms / 86400000) + 1;
}

export type Totals = {
  days: number;
  subtotal: number;        // pre-discount: pricePerDay × days (car only)
  discountPercent: number; // 0 = no discount (sanitised, never negative)
  discountAmount: number;  // ETB saved, rounded to whole birr
  driverFeePerDay: number; // snapshot: owner-driver fee/day (0 unless OWNER_DRIVER mode)
  driverTotal: number;     // snapshot: driverFeePerDay × days
  fee: number;             // 10% of the POST-discount car amount + driver fee — the fee base is the OVERALL booking price (FR-49)
  total: number;           // subtotal − discountAmount + driverTotal + fee
};

/** Snapshot maths (BR-03/BR-04) with an optional discount percent and an optional
 *  owner-driver daily fee (FR-49). Returns null for an invalid range. */
export function computeTotals(pricePerDay: number, start: Date, end: Date, discountPercent = 0, driverFeePerDay = 0): Totals | null {
  if (!(start instanceof Date) || !(end instanceof Date) || isNaN(start.getTime()) || isNaN(end.getTime())) return null;
  if (end.getTime() < start.getTime()) return null;
  const days = daysInclusive(start, end);
  const subtotal = pricePerDay * days;
  // Sanitise here so every caller inherits safe maths: negative/NaN percent → 0, never above 100.
  const pct = Number.isFinite(discountPercent) && discountPercent > 0 ? Math.min(Math.round(discountPercent), 100) : 0;
  const discountAmount = Math.round((subtotal * pct) / 100);
  const driver = Number.isFinite(driverFeePerDay) && driverFeePerDay > 0 ? Math.round(driverFeePerDay) : 0;
  const driverTotal = driver * days;
  const discounted = subtotal - discountAmount;
  // FR-49: the 10% platform fee applies to the OVERALL booking price — car (post-discount) + owner driver fee.
  const fee = Math.round((discounted + driverTotal) * PLATFORM_FEE_RATE); // BR-04
  return { days, subtotal, discountPercent: pct, discountAmount, driverFeePerDay: driver, driverTotal, fee, total: discounted + driverTotal + fee };
}

export function formatETB(n: number): string {
  return "ETB " + n.toLocaleString("en-US");
}

export function formatDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

export function formatDateTime(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Addis_Ababa" });
}

export function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function todayISO(): string {
  return toISODate(new Date());
}

/** BR-05: inclusive range overlap. */
export function rangesOverlap(s1: Date, e1: Date, s2: Date, e2: Date): boolean {
  return s1.getTime() <= e2.getTime() && s2.getTime() <= e1.getTime();
}

/** True when [start,end] intersects any of the blocked ISO dates (FR-14/FR-35). */
export function hitsBlockedDates(start: Date, end: Date, blocked: Date[]): boolean {
  return blocked.some((b) => {
    const day = new Date(toISODate(b) + "T00:00:00.000Z");
    return start.getTime() <= day.getTime() && day.getTime() <= end.getTime();
  });
}

export function nextMonthISO(): string {
  const t = new Date();
  t.setMonth(t.getMonth() + 1);
  return toISODate(t);
}
