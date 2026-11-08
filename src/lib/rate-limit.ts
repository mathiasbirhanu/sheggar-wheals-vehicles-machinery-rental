import "server-only";
// In-memory sliding-window rate limiter (NFR security / abuse resistance).
// Keyed by scope + client IP; sized for a single-node deployment. When scaling
// horizontally, back this with the same Postgres instance or Redis.
// Every rejection is emitted as a structured warn log (scope + IP) so abuse
// attempts leave an audit trail any log shipper can query.
import { headers } from "next/headers";
import { createLogger } from "@/lib/logger";

const log = createLogger("rate-limit");
const buckets = new Map<string, { count: number; resetAt: number }>();
const MAX_BUCKETS = 10_000;

function prune(now: number) {
  for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
}

export type RateResult = { ok: boolean; retryAfterSec: number };

/** Consume one token for `key`. Returns ok=false with a retry hint once the limit is exceeded. */
export function rateLimit(key: string, limit: number, windowMs: number): RateResult {
  const now = Date.now();
  const entry = buckets.get(key);
  if (!entry || entry.resetAt <= now) {
    if (buckets.size >= MAX_BUCKETS) prune(now);
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSec: 0 };
  }
  entry.count += 1;
  if (entry.count > limit) {
    const retryAfterSec = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
    const [scope, ip] = key.includes(":") ? [key.slice(0, key.indexOf(":")), key.slice(key.indexOf(":") + 1)] : [key, "unknown"];
    log.warn("rate limit exceeded", { scope, ip, retryAfterSec });
    return { ok: false, retryAfterSec };
  }
  return { ok: true, retryAfterSec: 0 };
}

/** Best-effort client identity behind the sandbox gateway / reverse proxy. */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "127.0.0.1"
  );
}

/** Convenience: scoped key for the calling client. */
export async function scopedKey(scope: string): Promise<string> {
  return `${scope}:${await clientIp()}`;
}
