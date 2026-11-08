// Availability manager (FR-35): block/unblock dates; clashes with active bookings are refused.
import { notFound } from "next/navigation";
import { apiGetOr404 } from "@/lib/api";
import { requireActiveUser } from "@/lib/auth";
import { toISODate, formatDate } from "@/lib/pricing";
import { addBlockedDatesAction, removeBlockedDateAction } from "@/actions/cars";
import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/submit-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Availability" };

export default async function AvailabilityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireActiveUser();
  const { car } = await apiGetOr404<{ car: import("@/lib/domain").Car }>(`/api/view/owner/cars/${id}`);
  void user;

  const blocked = [...car.unavailableDates].sort((a, b) => a.getTime() - b.getTime()).map(toISODate);
  const today = toISODate(new Date());

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Availability — {car.make} {car.model}</CardTitle>
          <p className="text-sm text-muted-foreground">Blocked days cannot be selected by renters. Dates that overlap active bookings cannot be unblocked (FR-35).</p>
        </CardHeader>
        <CardContent className="space-y-5">
          <ActionForm action={addBlockedDatesAction} className="space-y-3">
            <input type="hidden" name="carId" value={car.id} />
            <div className="space-y-1.5">
              <Label htmlFor="dates">Block a date</Label>
              <Input id="dates" name="dates" type="date" min={today} required />
            </div>
            <SubmitButton size="sm">Block date</SubmitButton>
          </ActionForm>

          <div>
            <p className="mb-2 text-sm font-medium">Currently blocked ({blocked.length})</p>
            {blocked.length === 0 ? (
              <p className="text-sm text-muted-foreground">No blocked dates — every day is bookable.</p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {blocked.map((d) => (
                  <li key={d}>
                    <ActionForm action={removeBlockedDateAction} className="inline">
                      <input type="hidden" name="carId" value={car.id} />
                      <input type="hidden" name="date" value={d} />
                      <Badge variant="outline" className="gap-1 py-1.5 pr-1 text-red-700">
                        {formatDate(d + "T00:00:00.000Z")}
                        <button type="submit" aria-label={`Unblock ${d}`} className="ml-1 rounded-full p-0.5 hover:bg-red-100"><X className="h-3 w-3" /></button>
                      </Badge>
                    </ActionForm>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
