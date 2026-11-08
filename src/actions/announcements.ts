"use server";
// Owner-submitted announcements (events + discounts) — FR-44 extension.
// Moderation gate (BR-02 pattern, third door): owners submit as active=false,
// an admin publishes from /admin/announcements. Validation and the
// car-ownership check run in the C# backend.
import { callAction } from "@/lib/api";
import type { ActionState } from "@/lib/validation";

export async function createOwnerAnnouncementAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return callAction("/api/actions/announcements/owner-create", {
    title: String(formData.get("title") ?? ""),
    body: String(formData.get("body") ?? ""),
    kind: String(formData.get("kind") ?? ""),
    discountPercent: String(formData.get("discountPercent") ?? ""),
    carId: String(formData.get("carId") ?? ""),
    validUntil: String(formData.get("validUntil") ?? ""),
  }, ["/owner", "/admin/announcements"]);
}
