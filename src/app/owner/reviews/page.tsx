// Owner reviews (FR-31): see reviews of own cars, reply once.
import Link from "next/link";
import { apiGet } from "@/lib/api";
import { requireActiveUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/pricing";
import { replyToReviewAction } from "@/actions/platform";
import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/submit-button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Star } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Reviews" };

export default async function OwnerReviewsPage() {
  const user = await requireActiveUser();
  const { reviews } = await apiGet<{ reviews: import("@/lib/domain").Review[] }>("/api/view/owner/reviews");

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-8">
      <h1 className="text-2xl font-bold">Reviews of your cars</h1>
      {reviews.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">No reviews yet — they appear after renters complete trips.</CardContent></Card>
      ) : (
        <ul className="space-y-4">
          {reviews.map((r) => (
            <li key={r.id}>
              <Card>
                <CardContent className="space-y-3 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm">
                      <span className="font-semibold">{r.renter.name}</span> on{" "}
                      <Link href={"/cars/" + r.car.id} className="font-medium hover:underline">{r.car.make} {r.car.model}</Link>
                      <span className="ml-2 inline-flex" aria-label={`${r.rating} out of 5`}>
                        {Array.from({ length: 5 }, (_, i) => <Star key={i} className={`inline h-4 w-4 ${i < r.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} aria-hidden />)}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(r.createdAt)}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">{r.comment}</p>
                  {r.ownerReply ? (
                    <div className="rounded-md bg-muted p-3 text-sm">
                      <p className="text-xs font-semibold text-muted-foreground">Your reply:</p>
                      <p className="mt-0.5">{r.ownerReply}</p>
                    </div>
                  ) : (
                    <ActionForm action={replyToReviewAction} className="space-y-2 rounded-lg border border-dashed p-3">
                      <input type="hidden" name="reviewId" value={r.id} />
                      <Label htmlFor={"reply-" + r.id} className="text-sm">Reply publicly (once per review)</Label>
                      <Textarea id={"reply-" + r.id} name="reply" rows={2} required minLength={3} placeholder="Thank the guest, add context, note fixes…" />
                      <SubmitButton size="sm" variant="outline">Publish reply</SubmitButton>
                    </ActionForm>
                  )}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
