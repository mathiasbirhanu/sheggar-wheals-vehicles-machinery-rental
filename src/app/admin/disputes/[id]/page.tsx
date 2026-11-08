// Resolve a dispute (FR-43): recorded notes, resolver, timestamp; booking restored; parties notified.
import Link from "next/link";
import { notFound } from "next/navigation";
import { apiGetOr404 } from "@/lib/api";
import { requireActiveUser } from "@/lib/auth";
import { formatETB, formatDate, formatDateTime } from "@/lib/pricing";
import { resolveDisputeAction } from "@/actions/platform";
import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/submit-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const dynamic = "force-dynamic";

export default async function AdminDisputeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireActiveUser();
  const data = await apiGetOr404<{ dispute: import("@/lib/domain").Dispute }>(`/api/view/admin/disputes/${id}`);
  const dispute = data.dispute;
  const b = dispute.booking;

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-8">
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground"><Link href="/admin/disputes" className="hover:text-foreground">Disputes</Link> <span aria-hidden>/</span> {b.car.make} {b.car.model}</nav>
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">Dispute on the {b.car.make} {b.car.model}
            <Badge variant={dispute.status === "OPEN" ? "secondary" : "outline"} className={dispute.status === "OPEN" ? "bg-orange-100 text-orange-800 hover:bg-orange-100" : "text-emerald-700"}>{dispute.status.toLowerCase()}</Badge>
          </CardTitle>
          <p className="text-sm text-muted-foreground">{formatDate(b.startDate)} → {formatDate(b.endDate)} · {formatETB(b.total)} · renter {b.renter.name} / owner {b.owner.name} · booking status: {b.status.toLowerCase()}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border p-4 text-sm">
            <p className="font-semibold">Opened by {dispute.openedBy.name} · {formatDateTime(dispute.createdAt)}</p>
            <p className="mt-1 text-muted-foreground">{dispute.reason}</p>
          </div>

          {dispute.status === "RESOLVED" ? (
            <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-sm dark:border-emerald-900 dark:bg-emerald-950">
              <p className="font-semibold text-emerald-800 dark:text-emerald-200">Resolved by {dispute.resolvedBy?.name} · {dispute.resolvedAt && formatDateTime(dispute.resolvedAt)}</p>
              <p className="mt-1">{dispute.resolutionNotes}</p>
            </div>
          ) : (
            <ActionForm action={resolveDisputeAction} className="space-y-3 rounded-lg border border-dashed p-4">
              <input type="hidden" name="disputeId" value={dispute.id} />
              <Label htmlFor="notes">Resolution notes (recorded with resolver and timestamp — FR-43)</Label>
              <Textarea id="notes" name="notes" rows={3} required minLength={10} placeholder="What did the evidence show, and what action was taken?" />
              <SubmitButton className="bg-brand text-brand-foreground hover:bg-brand/90">Resolve dispute</SubmitButton>
              <p className="text-xs text-muted-foreground">Resolving sets the booking back to completed (from its pre-dispute state) and notifies both parties.</p>
            </ActionForm>
          )}
          <p className="text-sm"><Link href={"/bookings/" + b.id} className="text-brand hover:underline">View the full booking →</Link></p>
        </CardContent>
      </Card>
    </div>
  );
}
