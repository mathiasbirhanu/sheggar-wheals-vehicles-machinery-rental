"use client";
// ── FR-46 · NOTIFICATION BELL — v3, complete rewrite ─────────────────────
//
// REQUIREMENT (what this component does):
//   1. The red badge shows ONLY unseen notifications (read = false).
//   2. OPENING the bell = the user has seen the list: the number vanishes
//      instantly on screen AND read = true is saved in the database, so it
//      stays gone after reload and on every other device.
//   3. The dropdown always lists the 8 newest notifications ("View all"
//      opens the full /notifications page).
//
// It is fully SELF-CONTAINED. It talks only to two API routes:
//   GET  /api/notifications/summary  -> { unread: number, recent: Recent[] }
//   POST /api/notifications/read-all -> marks every unseen row as seen
// No server actions, no context, no other components are involved.
// ─────────────────────────────────────────────────────────────────────────
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

type Recent = { id: string; title: string; body: string; link: string | null; read: boolean };

export function NotificationBell() {
  const [unseen, setUnseen] = useState(0); // ← the badge number
  const [recent, setRecent] = useState<Recent[]>([]); // ← the dropdown list
  const [open, setOpen] = useState(false); // ← panel visibility (controlled)
  const busy = useRef(false); // guard: never fire mark-all twice at once

  // Load badge count + list. Silent on any failure — the bell must never
  // break the page. (401 while signed out = do nothing.)
  const loadSummary = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications/summary", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { unread: number; recent: Recent[] };
      setUnseen(data.unread);
      setRecent(data.recent);
      console.debug(`[bell] ${data.unread} unseen notification(s)`);
    } catch {
      // network hiccup — keep the last known state
    }
  }, []);

  // Opening the bell counts as "seen": clear the badge + dots immediately,
  // then persist read = true. If the request fails, resync from the server
  // so the badge always shows the truth.
  const markAllSeen = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    setUnseen(0);
    setRecent((rs) => rs.map((r) => (r.read ? r : { ...r, read: true })));
    try {
      const res = await fetch("/api/notifications/read-all", { method: "POST" });
      if (!res.ok) throw new Error(`status ${res.status}`);
      console.debug("[bell] all notifications marked seen");
    } catch {
      loadSummary();
    } finally {
      busy.current = false;
    }
  }, [loadSummary]);

  // First load + refresh every 15 s + refresh when the tab becomes visible
  // again (so notifications that arrived while the tab was hidden show up).
  // 15 s matches the AutoRefresh pace used on the data pages.
  useEffect(() => {
    const initial = setTimeout(loadSummary, 0);
    const poll = setInterval(loadSummary, 15_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") loadSummary();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(initial);
      clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [loadSummary]);

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o) void markAllSeen(); }}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={`Notifications, ${unseen} unseen`}>
          <Bell className="h-5 w-5" />
          {unseen > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-brand-foreground" aria-hidden>
              {unseen > 9 ? "9+" : unseen}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b px-3 py-2 text-sm font-medium">Notifications</div>
        <div className="max-h-80 overflow-y-auto">
          {recent.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">No notifications yet.</p>
          )}
          {recent.map((n) => (
            <Link key={n.id} href={n.link ?? "/notifications"} onClick={() => setOpen(false)} className="block border-b px-3 py-2.5 text-sm last:border-0 hover:bg-muted/50">
              <p className="flex items-center gap-2 font-medium">
                {!n.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand" aria-label="unseen" />}
                {n.title}
              </p>
              <p className="line-clamp-2 text-muted-foreground">{n.body}</p>
            </Link>
          ))}
        </div>
        <div className="border-t p-2">
          <Button asChild variant="ghost" size="sm" className="w-full">
            <Link href="/notifications" onClick={() => setOpen(false)}>View all</Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
