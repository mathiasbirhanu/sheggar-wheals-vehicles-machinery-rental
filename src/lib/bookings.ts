// Booking lifecycle rules (SRS Chapter 6, BR-05) — the PURE rendering-side
// mirror of SheggarWheels.Api/Services/BookingRules.cs. All database work now
// lives in the C# backend; the pages only need these constants to decide which
// buttons to render. The SERVER always re-checks every transition.
import { type BookingStatus } from "@/lib/domain";

/** States that hold the car's calendar (BR-05). */
export const BLOCKING_STATUSES: BookingStatus[] = ["REQUESTED", "CONFIRMED", "IN_PROGRESS", "DISPUTED"];

/** Statuses that hard-hold the calendar at approval time. */
export const HARD_HOLD_STATUSES: BookingStatus[] = ["CONFIRMED", "IN_PROGRESS", "DISPUTED"];

/** Permitted transitions (SRS Chapter 6 finite state machine). */
export const TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  REQUESTED: ["CONFIRMED", "DECLINED", "CANCELLED"],
  CONFIRMED: ["IN_PROGRESS", "CANCELLED", "DISPUTED"],
  IN_PROGRESS: ["COMPLETED", "DISPUTED"],
  COMPLETED: ["REVIEWED", "DISPUTED"],
  REVIEWED: [],
  DECLINED: [],
  CANCELLED: [],
  DISPUTED: ["RESOLVED"],
  RESOLVED: ["COMPLETED"], // restore after dispute resolution
};

export function canTransition(from: BookingStatus, to: BookingStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}
