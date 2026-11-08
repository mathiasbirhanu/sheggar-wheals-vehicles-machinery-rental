"use client";
// ── AUTO-REFRESH (smart polling) ─────────────────────────────────────────
//
// WHAT IT DOES:
//   Pages that render live data (booking lists, owner requests, admin
//   queues, earnings) call router.refresh() every 15 seconds so a new
//   booking, payment or licence submission appears WITHOUT a manual
//   browser reload. router.refresh() re-fetches only the server-rendered
//   parts of the current page — scroll position, open dropdowns and any
//   text the user is typing are all preserved (NFR-10).
//
// HOW IT IS POLITE TO THE SERVER AND THE USER:
//   1. While the tab is HIDDEN the timer keeps running but does nothing —
//      no requests are sent for a background tab.
//   2. The moment the tab becomes visible again it refreshes once, so the
//      user never looks at stale data after switching back.
//   3. It renders NOTHING — zero visual footprint.
//
// WHY POLLING (not WebSockets/SSE):
//   The app deploys to serverless hosting (Vercel) where persistent
//   connections need extra infrastructure. Interval polling is the same
//   strategy the notification bell already uses and is bulletproof.
//
// USAGE (server components can render it directly):
//   import { AutoRefresh } from "@/components/auto-refresh";
//   <AutoRefresh />              // 15 s default
//   <AutoRefresh intervalMs={10_000} />  // custom pace
// ─────────────────────────────────────────────────────────────────────────
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function AutoRefresh({ intervalMs = 15_000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    // One shared "should we fetch now?" rule for both triggers.
    const tick = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const poll = setInterval(tick, intervalMs);
    // Coming back to the tab = refresh immediately instead of waiting
    // up to a full interval for the next tick.
    const onVisible = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router, intervalMs]);

  return null;
}
