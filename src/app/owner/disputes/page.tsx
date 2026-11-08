// Owner disputes (FR-39/43 view for owners).
import Link from "next/link";
import { apiGet } from "@/lib/api";
import { requireActiveUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/pricing";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";
export const metadata = { title: "Disputes" };

export default async function OwnerDisputesPage() {
  const user = await requireActiveUser();
  const { disputes } = await apiGet<{ disputes: import("@/lib/domain").Dispute[] }>("/api/view/owner/disputes");

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-8">
      <h1 className="text-2xl font-bold">Disputes on your rentals</h1>
      {disputes.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">No disputes. Photo-documented handovers keep it that way.</CardContent></Card>
      ) : (
        <ul className="space-y-3">
          {disputes.map((d) => (
            <li key={d.id}>
              <Card>
                <CardContent className="space-y-2 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">{d.booking.car.make} {d.booking.car.model} · renter {d.booking.renter.name}</p>
                    <Badge variant={d.status === "OPEN" ? "secondary" : "outline"} className={d.status === "OPEN" ? "bg-orange-100 text-orange-800 hover:bg-orange-100" : "text-emerald-700"}>{d.status.toLowerCase()}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{d.reason}</p>
                  {d.resolutionNotes && <p className="text-sm"><span className="font-medium">Resolution:</span> {d.resolutionNotes}</p>}
                  <p className="text-xs text-muted-foreground">Opened {formatDateTime(d.createdAt)} · <Link href={"/bookings/" + d.bookingId} className="text-brand hover:underline">view booking</Link></p>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
