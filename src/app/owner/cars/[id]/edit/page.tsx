// Edit own listing (FR-33) + activate/deactivate toggle. NT-04: only the owner's own cars resolve.
import { notFound } from "next/navigation";
import Link from "next/link";
import { apiGetOr404 } from "@/lib/api";
import { requireActiveUser } from "@/lib/auth";
import { updateCarAction, toggleCarActiveAction } from "@/actions/cars";
import { ActionForm } from "@/components/action-form";
import { CarFormFields } from "@/components/car-form-fields";
import { SubmitButton } from "@/components/submit-button";
import { CarStatusBadge } from "@/components/status-badges";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";
export const metadata = { title: "Edit listing" };

export default async function EditCarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireActiveUser();
  const { car } = await apiGetOr404<{ car: import("@/lib/domain").Car }>(`/api/view/owner/cars/${id}`);
  void user;

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">Edit listing <CarStatusBadge status={car.status} /></CardTitle>
          <p className="text-sm text-muted-foreground">Price edits apply to new requests only — existing bookings keep their snapshots (BR-03).</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <ActionForm action={updateCarAction} className="space-y-5">
            <CarFormFields car={car} />
            <SubmitButton className="bg-brand text-brand-foreground hover:bg-brand/90">Save changes</SubmitButton>
          </ActionForm>
          <div className="flex flex-wrap gap-2 border-t pt-4">
            {(car.status === "APPROVED" || car.status === "INACTIVE") && (
              <ActionForm action={toggleCarActiveAction}>
                <input type="hidden" name="carId" value={car.id} />
                <SubmitButton size="sm" variant="outline">{car.status === "APPROVED" ? "Deactivate listing" : "Re-activate listing"}</SubmitButton>
              </ActionForm>
            )}
            <Button asChild size="sm" variant="ghost"><Link href={"/owner/cars/" + car.id + "/availability"}>Manage availability</Link></Button>
            <Button asChild size="sm" variant="ghost"><Link href={"/owner/cars/" + car.id + "/bookings"}>View bookings</Link></Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
