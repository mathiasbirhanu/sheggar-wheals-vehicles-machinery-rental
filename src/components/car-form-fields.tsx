// Shared owner car form fields (FR-32/33) — server component, wrapped by ActionForm on the pages.
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PhotoPicker } from "@/components/photo-picker";
import { DocPicker } from "@/components/doc-picker";
import type { Car } from "@/lib/domain";

export function CarFormFields({ car }: { car?: Car }) {
  return (
    <div className="space-y-4">
      {car && <input type="hidden" name="carId" value={car.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="make">Make</Label>
          <Input id="make" name="make" required defaultValue={car?.make} placeholder="Toyota" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="model">Model</Label>
          <Input id="model" name="model" required defaultValue={car?.model} placeholder="Corolla" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="year">Year</Label>
          <Input id="year" name="year" type="number" min={1990} max={new Date().getFullYear() + 1} required defaultValue={car?.year ?? 2020} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="transmission">Transmission</Label>
          <Select name="transmission" defaultValue={car?.transmission ?? "MANUAL"}>
            <SelectTrigger id="transmission"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="MANUAL">Manual</SelectItem><SelectItem value="AUTOMATIC">Automatic</SelectItem></SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="fuelType">Fuel type</Label>
          <Select name="fuelType" defaultValue={car?.fuelType ?? "PETROL"}>
            <SelectTrigger id="fuelType"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="PETROL">Petrol</SelectItem>
              <SelectItem value="DIESEL">Diesel</SelectItem>
              <SelectItem value="HYBRID">Hybrid</SelectItem>
              <SelectItem value="ELECTRIC">Electric</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="seats">Seats</Label>
          <Input id="seats" name="seats" type="number" min={2} max={9} required defaultValue={car?.seats ?? 5} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pricePerDay">Price per day (ETB)</Label>
          <Input id="pricePerDay" name="pricePerDay" type="number" min={500} step={100} required defaultValue={car?.pricePerDay} placeholder="3000" />
        </div>
        {/* FR-49: optional owner-provided professional driver. Empty = renters must
            drive themselves (with an admin-approved licence) or bring their own driver. */}
        <div className="space-y-1.5">
          <Label htmlFor="driverFeePerDay">Offer a driver? (ETB/day, optional)</Label>
          <Input id="driverFeePerDay" name="driverFeePerDay" type="number" min={100} step={50} defaultValue={car?.driverFeePerDay ?? undefined} placeholder="e.g. 800" />
          <p className="text-xs text-muted-foreground">Your professional driver joins the trip for this daily fee — renters pick it at booking and it&apos;s added to their total. Leave empty if you don&apos;t offer a driver.</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="city">City</Label>
          <Input id="city" name="city" required defaultValue={car?.city ?? "Addis Ababa"} readOnly aria-describedby="city-hint" />
          <p id="city-hint" className="text-xs text-muted-foreground">The demo operates in Addis Ababa.</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="neighbourhood">Neighbourhood</Label>
          <Input id="neighbourhood" name="neighbourhood" required defaultValue={car?.neighbourhood} placeholder="Bole" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" rows={4} required minLength={20} defaultValue={car?.description} placeholder="Condition, fuel economy, rules, pickup spot…" />
      </div>
      <PhotoPicker initial={car?.photos ?? []} />
      {/* FR-47: technical valuation — REQUIRED with every listing. The admin
          checks this document on /admin/listings before approving (BR-02). */}
      <DocPicker
        name="valuationDoc"
        label="Technical valuation report"
        description="Upload a photo or scan of the technical inspection / valuation report for this car (from an inspection center or a licensed valuer). The admin reviews it before the listing goes public."
        required
        initial={car?.valuationDoc ?? null}
      />
      <div className="space-y-1.5 sm:w-1/2">
        <Label htmlFor="valuationAmount">Declared market value in ETB (optional)</Label>
        <Input
          id="valuationAmount"
          name="valuationAmount"
          type="number"
          min={0}
          step={1000}
          defaultValue={car?.valuationAmount ?? undefined}
          placeholder="450000"
        />
        <p className="text-xs text-muted-foreground">The value stated in the valuation report — shown to the admin during approval.</p>
      </div>
    </div>
  );
}
