// Dispute queue (FR-43, BR-07).
import Link from "next/link";
import { apiGet } from "@/lib/api";
import { requireActiveUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/pricing";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";
export const metadata = { title: "Disputes" };

export default async function AdminDisputesPage() {
  await requireActiveUser();
  const { disputes } = await apiGet<{ disputes: import("@/lib/domain").Dispute[] }>("/api/view/admin/disputes");
  const open = disputes.filter((d) => d.status === "OPEN");

  return (
    <div className="mx-auto max-w-4xl space-y-4 px-4 py-8">
      <h1 className="text-2xl font-bold">Disputes <span className="text-base font-normal text-muted-foreground">({open.length} open)</span></h1>
      {disputes.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">No disputes on the platform.</CardContent></Card>
      ) : (
        <ul className="space-y-3">
          {disputes.map((d) => (
            <li key={d.id}>
              <Card>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 font-semibold">{d.booking.car.make} {d.booking.car.model}
                      <Badge variant={d.status === "OPEN" ? "secondary" : "outline"} className={d.status === "OPEN" ? "bg-orange-100 text-orange-800 hover:bg-orange-100" : "text-emerald-700"}>{d.status.toLowerCase()}</Badge>
                    </p>
                    <p className="truncate text-sm text-muted-foreground">{d.reason}</p>
                    <p className="text-xs text-muted-foreground">by {d.openedBy.name} · {formatDateTime(d.createdAt)} · renter {d.booking.renter.name} / owner {d.booking.owner.name}</p>
                  </div>
                  <Button asChild size="sm" variant={d.status === "OPEN" ? "secondary" : "ghost"}><Link href={"/admin/disputes/" + d.id}>{d.status === "OPEN" ? "Resolve" : "View"}</Link></Button>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
      <p className="text-sm text-muted-foreground"><Link href="/admin" className="text-brand hover:underline">← Admin console</Link></p>
    </div>
  );
}
