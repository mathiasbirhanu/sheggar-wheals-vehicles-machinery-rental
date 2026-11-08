"use server";
// Auth actions (FR-01..06, BR-01, BR-08, BR-09) — thin proxies to the C#
// backend. The rules, hashing, rate limits and session cookies all live in
// ASP.NET Core now; the cookie relay happens in lib/api.ts callAction().
import { callAction } from "@/lib/api";
import type { ActionState } from "@/lib/validation";

export async function signInAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return callAction("/api/actions/signin", {
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
    next: formData.get("next") ? String(formData.get("next")) : null,
  });
}

export async function signUpAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return callAction("/api/actions/signup", {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    password: String(formData.get("password") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
    asOwner: formData.get("asOwner") === "on",
    rentalLicenseDoc: String(formData.get("rentalLicenseDoc") ?? ""), // FR-48: optional
  });
}

export async function signOutAction(): Promise<void> {
  await callAction("/api/actions/signout", {});
}
