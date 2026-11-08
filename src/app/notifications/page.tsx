// In-app notifications (FR-46).
import Link from "next/link";
import { apiGet } from "@/lib/api";
import { requireActiveUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/pricing";
import { markAllNotificationsReadAction, markNotificationReadAction } from "@/actions/platform";
import { SubmitButton } from "@/components/submit-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const user = await requireActiveUser();
  const { items } = await apiGet<{ items: import("@/lib/domain").Notification[] }>("/api/view/notifications");
  const unread = items.filter((n) => !n.read).length;

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Notifications {unread > 0 && <span className="text-base font-normal text-muted-foreground">({unread} unread)</span>}</h1>
        {unread > 0 && (
          <form action={markAllNotificationsReadAction}>
            <SubmitButton variant="outline" size="sm">Mark all read</SubmitButton>
          </form>
        )}
      </header>
      <Card>
        <CardContent className="p-0">
          {items.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">Nothing here yet. Booking updates, payments, reviews, and admin announcements arrive in this list.</p>
          ) : (
            <ul className="divide-y">
              {items.map((n) => (
                <li key={n.id} className={cn("flex items-start gap-3 p-4", !n.read && "bg-brand/5 dark:bg-brand/10")}>
                  <span className={cn("mt-2 h-2 w-2 shrink-0 rounded-full", n.read ? "bg-transparent" : "bg-brand")} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{n.title}</p>
                    <p className="text-sm text-muted-foreground">{n.body}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(n.createdAt)}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    {n.link && !n.read && (
                      <form action={markNotificationReadAction}>
                        <input type="hidden" name="id" value={n.id} />
                        <SubmitButton variant="ghost" size="sm">Mark read</SubmitButton>
                      </form>
                    )}
                    {n.link && <Link href={n.link} className="text-sm font-medium text-brand hover:underline">Open</Link>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
