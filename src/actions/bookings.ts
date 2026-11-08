"use server";
// Booking lifecycle actions (FR-17..24, BR-03..05, BR-11) — thin proxies to the
// C# backend. The state machine, overlap checks, price snapshots and escrow
// rules all run in ASP.NET Core; this layer maps FormData → JSON.
import { callAction } from "@/lib/api";
import type { ActionState } from "@/lib/validation";

const BOOKING_PATHS = ["/bookings", "/owner", "/admin/bookings"];

/** FR-17/18 + FR-49: create a request with a server-side price snapshot and the drive mode. */
export async function requestBookingAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return callAction("/api/actions/bookings/request", {
    carId: String(formData.get("carId") ?? ""),
    startDate: String(formData.get("startDate") ?? ""),
    endDate: String(formData.get("endDate") ?? ""),
    driveMode: String(formData.get("driveMode") ?? ""),
    driverName: formData.get("driverName") !== null ? String(formData.get("driverName")) : null,
    driverLicenseNumber: formData.get("driverLicenseNumber") !== null ? String(formData.get("driverLicenseNumber")) : null,
    driverLicenseImage: formData.get("driverLicenseImage") !== null ? String(formData.get("driverLicenseImage")) : null,
    termsAgreed: String(formData.get("termsAgreed") ?? ""),
    termsVersion: String(formData.get("termsVersion") ?? ""),
  }, [...BOOKING_PATHS, "/cars"]);
}

/** FR-20: owner approves — the licence is approved with it. */
export async function approveBookingAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const bookingId = String(formData.get("bookingId") ?? "");
  return callAction("/api/actions/bookings/approve", { bookingId }, [...BOOKING_PATHS, "/bookings/" + bookingId]);
}

/** FR-20: owner declines — the driving licence is rejected with it (optional reason). */
export async function declineBookingAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const bookingId = String(formData.get("bookingId") ?? "");
  return callAction("/api/actions/bookings/decline", {
    bookingId,
    licenseDecisionNote: String(formData.get("licenseDecisionNote") ?? ""),
  }, [...BOOKING_PATHS, "/bookings/" + bookingId]);
}

/** FR-21: renter cancels when the lifecycle permits it. */
export async function cancelBookingAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const bookingId = String(formData.get("bookingId") ?? "");
  return callAction("/api/actions/bookings/cancel", { bookingId }, [...BOOKING_PATHS, "/bookings/" + bookingId]);
}

/** FR-22: owner marks pickup (demo trip tracking becomes eligible). */
export async function startTripAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const bookingId = String(formData.get("bookingId") ?? "");
  return callAction("/api/actions/bookings/start-trip", { bookingId }, [...BOOKING_PATHS, "/bookings/" + bookingId]);
}

/** FR-22 + escrow release: owner marks return; held funds become paid. */
export async function completeTripAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const bookingId = String(formData.get("bookingId") ?? "");
  return callAction("/api/actions/bookings/complete-trip", { bookingId }, [...BOOKING_PATHS, "/bookings/" + bookingId]);
}

/** FR-23/24: multi-method checkout — money is HELD in escrow until trip completion. */
export async function payBookingAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const bookingId = String(formData.get("bookingId") ?? "");
  return callAction("/api/actions/bookings/pay", {
    bookingId,
    method: String(formData.get("method") ?? ""),
    contact: String(formData.get("contact") ?? ""),
    paymentTermsAgreed: String(formData.get("paymentTermsAgreed") ?? ""),
    paymentTermsVersion: String(formData.get("paymentTermsVersion") ?? ""),
  }, [...BOOKING_PATHS, "/checkout/" + bookingId]);
}

/** FR-39/43: either party opens a dispute (BR-07). */
export async function openDisputeAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const bookingId = String(formData.get("bookingId") ?? "");
  return callAction("/api/actions/bookings/open-dispute", {
    bookingId,
    reason: String(formData.get("reason") ?? ""),
  }, [...BOOKING_PATHS, "/bookings/" + bookingId]);
}
