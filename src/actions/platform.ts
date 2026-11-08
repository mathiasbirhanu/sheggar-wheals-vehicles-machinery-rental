"use server";
// Reviews (FR-29..31, BR-06), notification marks (FR-46), admin actions
// (FR-40..44, BR-07/08/10) — thin proxies to the C# backend.
import { callAction } from "@/lib/api";
import type { ActionState } from "@/lib/validation";

// ── Reviews ───────────────────────────────────────────────────────────────

/** FR-29/30: one review per completed booking (BR-06). */
export async function createReviewAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const bookingId = String(formData.get("bookingId") ?? "");
  return callAction("/api/actions/reviews/create", {
    bookingId,
    rating: String(formData.get("rating") ?? ""),
    comment: String(formData.get("comment") ?? ""),
  }, ["/bookings/" + bookingId, "/owner/reviews", "/cars"]);
}

/** FR-31: owner replies once to a review. */
export async function replyToReviewAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const reviewId = String(formData.get("reviewId") ?? "");
  return callAction("/api/actions/reviews/reply", {
    reviewId,
    reply: String(formData.get("reply") ?? ""),
  }, ["/owner/reviews"]);
}

// ── Notifications (FR-46) ─────────────────────────────────────────────────

export async function markAllNotificationsReadAction(): Promise<void> {
  await callAction("/api/actions/notifications/read", { all: true }, ["/notifications"]);
}

export async function markNotificationReadAction(formData: FormData): Promise<void> {
  await callAction("/api/actions/notifications/read", { id: String(formData.get("id") ?? "") }, ["/notifications"]);
}

// ── Admin (FR-40..44) ─────────────────────────────────────────────────────

/** FR-40 / BR-02: approve a pending listing. */
export async function approveListingAction(formData: FormData): Promise<void> {
  await callAction("/api/actions/admin/approve-listing", { id: String(formData.get("carId") ?? "") }, ["/admin/listings", "/cars", "/owner/cars"]);
}

/** FR-40 / BR-02: reject a listing. */
export async function rejectListingAction(formData: FormData): Promise<void> {
  await callAction("/api/actions/admin/reject-listing", { id: String(formData.get("carId") ?? "") }, ["/admin/listings", "/cars", "/owner/cars"]);
}

/** FR-41 / BR-10: suspend a demo account. */
export async function suspendUserAction(formData: FormData): Promise<void> {
  const userId = String(formData.get("userId") ?? "");
  await callAction("/api/actions/admin/suspend-user", { id: userId }, ["/admin/users", "/admin/users/" + userId]);
}

/** FR-41: reinstate a suspended account. */
export async function reinstateUserAction(formData: FormData): Promise<void> {
  const userId = String(formData.get("userId") ?? "");
  await callAction("/api/actions/admin/reinstate-user", { id: userId }, ["/admin/users", "/admin/users/" + userId]);
}

/** FR-43 / BR-07: resolve a dispute with recorded notes. */
export async function resolveDisputeAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const disputeId = String(formData.get("disputeId") ?? "");
  return callAction("/api/actions/admin/resolve-dispute", {
    disputeId,
    notes: String(formData.get("notes") ?? ""),
  }, ["/admin/disputes", "/admin/disputes/" + disputeId]);
}

/** FR-44: create an announcement and fan it out in-app (BR-12). */
export async function createAnnouncementAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return callAction("/api/actions/admin/create-announcement", {
    title: String(formData.get("title") ?? ""),
    body: String(formData.get("body") ?? ""),
  }, ["/admin/announcements", "/", "/dashboard"]);
}

/** FR-44: toggle an announcement's active flag. */
export async function toggleAnnouncementAction(formData: FormData): Promise<void> {
  await callAction("/api/actions/admin/toggle-announcement", { id: String(formData.get("id") ?? "") }, ["/admin/announcements", "/"]);
}
