"use server";
// Owner listing actions (FR-32..35, BR-02, BR-03, BR-11) — thin proxies to the
// C# backend. Validation, ownership checks and the moderation flow run in
// ASP.NET Core; this layer only maps FormData → JSON and refreshes paths.
import { callAction } from "@/lib/api";
import type { ActionState } from "@/lib/validation";

const OWNER_PATHS = ["/owner", "/owner/cars", "/cars", "/"];

function carBody(formData: FormData) {
  const valuationAmountRaw = String(formData.get("valuationAmount") ?? "").trim();
  const driverFeeRaw = String(formData.get("driverFeePerDay") ?? "").trim(); // FR-49: optional owner-driver fee
  return {
    carId: String(formData.get("carId") ?? ""),
    make: String(formData.get("make") ?? ""),
    model: String(formData.get("model") ?? ""),
    year: String(formData.get("year") ?? ""),
    transmission: String(formData.get("transmission") ?? ""),
    fuelType: String(formData.get("fuelType") ?? "PETROL"),
    seats: String(formData.get("seats") ?? ""),
    city: String(formData.get("city") ?? "Addis Ababa"),
    neighbourhood: String(formData.get("neighbourhood") ?? ""),
    pricePerDay: String(formData.get("pricePerDay") ?? ""),
    description: String(formData.get("description") ?? ""),
    photos: formData.getAll("photos").map(String).filter(Boolean),
    valuationDoc: String(formData.get("valuationDoc") ?? ""),
    valuationAmount: valuationAmountRaw || null,
    driverFeePerDay: driverFeeRaw || null,
  };
}

/** FR-32: create a listing; it starts PENDING for admin moderation (BR-02). */
export async function createCarAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return callAction("/api/actions/cars/create", carBody(formData), OWNER_PATHS);
}

/** FR-33: edit own listing. Existing bookings keep their snapshots (BR-03). */
export async function updateCarAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const carId = String(formData.get("carId") ?? "");
  return callAction("/api/actions/cars/update", carBody(formData), [
    ...OWNER_PATHS,
    "/owner/cars/" + carId,
    "/owner/cars/" + carId + "/edit",
    "/owner/cars/" + carId + "/availability",
    "/cars/" + carId,
  ]);
}

/** FR-33: owner activates/deactivates an approved listing. */
export async function toggleCarActiveAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const carId = String(formData.get("carId") ?? "");
  return callAction("/api/actions/cars/toggle-active", { carId }, [
    ...OWNER_PATHS,
    "/owner/cars/" + carId + "/edit",
    "/cars/" + carId,
  ]);
}

/** FR-35: add blocked dates; dates clashing with active bookings are refused. */
export async function addBlockedDatesAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const carId = String(formData.get("carId") ?? "");
  return callAction("/api/actions/cars/block-dates", {
    carId,
    dates: formData.getAll("dates").map(String),
  }, [
    ...OWNER_PATHS,
    "/owner/cars/" + carId + "/availability",
    "/cars/" + carId,
  ]);
}

/** FR-35: remove a blocked date; prevented when an active booking overlaps it. */
export async function removeBlockedDateAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const carId = String(formData.get("carId") ?? "");
  return callAction("/api/actions/cars/unblock-date", {
    carId,
    date: String(formData.get("date") ?? ""),
  }, [
    ...OWNER_PATHS,
    "/owner/cars/" + carId + "/availability",
    "/cars/" + carId,
  ]);
}
