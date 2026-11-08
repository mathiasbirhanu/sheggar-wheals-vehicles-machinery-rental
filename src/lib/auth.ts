// Session auth (FR-01..06, BR-08, BR-09, BR-10, NFR-10) — now backed by the
// C# API. The sw_session cookie is still the signed token it always was; this
// module just asks the backend to verify it and load the user, instead of
// querying the database directly. Same guards, same redirect behaviour.
import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { apiGet } from "@/lib/api";
import { Role, UserStatus, type User } from "@/lib/domain";

const COOKIE = "sw_session";

export type SessionUser = Pick<User, "id" | "email" | "name" | "phone" | "roles" | "status">;

/** Current signed-in user or null. Cached per request. */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  try {
    const data = await apiGet<{ user: SessionUser | null }>("/api/auth/session");
    return data.user ?? null;
  } catch {
    return null; // backend unreachable — treat as signed out, never crash the page
  }
});

/** BR-09: only internal, non-double-slash paths are safe return targets. */
export function safeReturnPath(next: string | null | undefined, fallback = "/dashboard"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}

/** Guard: signed-in, else redirect to /signin (NT-01). */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");
  return user!;
}

/** Guard: signed-in and not suspended (FR-06/BR-10). */
export async function requireActiveUser(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.status === UserStatus.SUSPENDED) redirect("/suspended");
  return user;
}

/** Guard: role check (FR-05/BR-08). Non-members are sent home — no disclosure. */
export async function requireRole(...allowed: Role[]): Promise<SessionUser> {
  const user = await requireActiveUser();
  if (!user.roles.some((r) => allowed.includes(r))) redirect("/");
  return user;
}

export function hasRole(user: SessionUser, role: Role): boolean {
  return user.roles.includes(role);
}

/** Kept for the suspended page's sign-out flow — clears the cookie locally. */
export async function destroySession(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE);
}
