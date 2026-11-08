// Announcements (FR-44): create + toggle; fan-out notifications (BR-12).
import { apiGet } from "@/lib/api";
import { requireActiveUser } from "@/lib/auth";
import { formatDateTime, formatDate } from "@/lib/pricing";
import { createAnnouncementAction, toggleAnnouncementAction } from "@/actions/platform";
import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/submit-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Megaphone, CalendarDays, Percent, Tag } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Announcements" };

export default async function AdminAnnouncementsPage() {
  await requireActiveUser();
  const { announcements } = await apiGet<{ announcements: import("@/lib/domain").Announcement[] }>("/api/view/admin/announcements");

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-8">
      <h1 className="text-2xl font-bold">Platform announcements</h1>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><Megaphone className="h-4 w-4" /> New announcement</CardTitle></CardHeader>
        <CardContent>
          <ActionForm action={createAnnouncementAction} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="title">Title</Label>
              <Input id="title" name="title" required minLength={4} maxLength={120} placeholder="e.g. Scheduled demo maintenance" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="body">Body</Label>
              <Textarea id="body" name="body" rows={3} required minLength={10} maxLength={1000} placeholder="Shown on the landing page and dashboards; every active user also gets a notification." />
            </div>
            <SubmitButton size="sm" className="bg-brand text-brand-foreground hover:bg-brand/90">Publish</SubmitButton>
          </ActionForm>
        </CardContent>
      </Card>

      <ul className="space-y-3">
        {announcements.map((a) => (
          <li key={a.id}>
            <Card>
              <CardContent className="space-y-2 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="flex flex-wrap items-center gap-2 font-semibold">
                    {a.title}
                    {a.kind === "DISCOUNT" ? (
                      <Badge variant="outline" className="gap-1 border-brand/30 bg-brand/10 text-brand"><Percent className="h-3 w-3" /> −{a.discountPercent}%</Badge>
                    ) : a.kind === "EVENT" ? (
                      <Badge variant="outline" className="gap-1 border-brand/30 bg-brand/10 text-brand"><CalendarDays className="h-3 w-3" /> event</Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1 text-muted-foreground"><Tag className="h-3 w-3" /> news</Badge>
                    )}
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge variant={a.active ? "secondary" : "outline"} className={a.active ? "bg-brand/15 text-brand hover:bg-brand/15" : "text-muted-foreground"}>{a.active ? "live" : "awaiting approval"}</Badge>
                    <form action={toggleAnnouncementAction}>
                      <input type="hidden" name="id" value={a.id} />
                      <SubmitButton size="sm" variant={a.active ? "ghost" : "default"}>{a.active ? "Hide" : "Approve & publish"}</SubmitButton>
                    </form>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{a.body}</p>
                {a.kind === "DISCOUNT" && a.car && (
                  <p className="text-xs font-medium text-brand">Target car: {a.car.make} {a.car.model} · {a.car.neighbourhood} — badge + booking maths apply on approval.</p>
                )}
                <p className="text-xs text-muted-foreground">
                  by {a.createdBy?.name} · {formatDateTime(a.createdAt)}
                  {a.validUntil && <> · runs until {formatDate(a.validUntil)}</>}
                </p>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
