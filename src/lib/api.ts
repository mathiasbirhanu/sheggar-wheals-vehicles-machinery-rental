// api.ts — the frontend's single door to the C# backend.
//
// Every DB read the old server components did with Prisma now goes through
// apiGet(); every server action forwards its FormData to an /api/actions/*
// endpoint through callAction(). Both forward the browser's sw_session cookie,
// so the C# API resolves the session exactly like the old code did.
//
// JSON dates come back as ISO strings — revive() turns them back into real
// Date objects so page code (getTime, toISOString, comparisons) keeps working
// with ZERO changes from the Prisma days.
import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { notFound } from "next/navigation";

export const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:5000";

/** Error thrown on non-2xx API responses. */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string | null,
    message: string,
  ) {
    super(message);
  }
}

const ISO_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

/** Deep-convert ISO datetime strings into Date instances (in place). */
function revive(value: unknown): unknown {
  if (typeof value === "string" && ISO_DATETIME.test(value)) return new Date(value);
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) value[i] = revive(value[i]);
    return value;
  }
  if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) (value as Record<string, unknown>)[k] = revive(v);
    return value;
  }
  return value;
}

/** Build the headers every server-side API call needs (cookies + client IP). */
async function apiHeaders(extra?: HeadersInit): Promise<Headers> {
  const h = new Headers(extra);
  const jar = await cookies();
  const cookie = jar.get("sw_session")?.value;
  if (cookie) h.set("cookie", `sw_session=${cookie}`);
  const hdrs = await headers();
  const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() || hdrs.get("x-real-ip") || "";
  if (ip) h.set("x-forwarded-for", ip);
  return h;
}

/** GET a JSON payload from the backend. Throws ApiError on 4xx/5xx. */
export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    headers: await apiHeaders(),
    cache: "no-store",
  });
  if (!res.ok) {
    let code: string | null = null;
    try {
      code = (await res.json())?.error ?? null;
    } catch {
      /* body not JSON — ignore */
    }
    throw new ApiError(res.status, code, `GET ${path} failed with ${res.status}`);
  }
  return revive(await res.json()) as T;
}

/** GET that treats a 404 exactly like the old notFound() pages did. */
export async function apiGetOr404<T>(path: string): Promise<T> {
  try {
    return await apiGet<T>(path);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }
}

export type ActionApiResult = {
  ok?: boolean;
  error?: string;
  message?: string;
  redirect?: string;
  sessionToken?: string;
  clearSession?: boolean;
  code?: string;
};

/**
 * POST a server-action payload. Guard responses replicate the original
 * redirects: unauthenticated → /signin, suspended → /suspended, missing
 * role → home. Session tokens are relayed as the sw_session cookie, matching
 * the old createSession() flags. revalidate paths keep caches fresh exactly
 * like the original refresh() helpers.
 */
export async function callAction(
  path: string,
  body: unknown,
  revalidate?: string[],
): Promise<ActionApiResult> {
  let res: Response;
  try {
    res = await fetch(`${BACKEND_URL}${path}`, {
      method: "POST",
      headers: await apiHeaders([["content-type", "application/json"]]),
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    return { error: "Cannot reach the backend service — please try again in a moment." };
  }

  // Guard semantics (see CurrentUser.RequireUser / RequireRole in C#).
  if (res.status === 401) redirect("/signin");
  if (res.status === 403) {
    let code = "";
    try {
      code = (await res.json())?.code ?? "";
    } catch {
      /* ignore */
    }
    redirect(code === "Suspended" ? "/suspended" : "/");
  }
  if (!res.ok) {
    try {
      const data = (await res.json()) as ActionApiResult;
      return { error: data.error ?? "Something went wrong — please try again." };
    } catch {
      return { error: "Something went wrong — please try again." };
    }
  }

  const data = revive(await res.json()) as ActionApiResult;

  // Relay the session cookie exactly like src/lib/auth.ts used to.
  const jar = await cookies();
  if (data.sessionToken) {
    jar.set("sw_session", data.sessionToken, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      secure: process.env.NODE_ENV === "production",
    });
  }
  if (data.clearSession) {
    jar.delete("sw_session");
  }

  if (revalidate) {
    const { revalidatePath } = await import("next/cache");
    for (const p of revalidate) revalidatePath(p);
  }

  if (data.redirect) redirect(data.redirect);
  return data;
}
