"use client";
// Booking form with live, client-side totals mirror of the server snapshot (FR-14/18, BR-04/05)
// and the FR-49 drive-mode chooser, Turo-style: SELF_DRIVE (renter's own licence attached),
// OWN_DRIVER (driver's licence attached), OWNER_DRIVER (extra fee/day joins the total and
// shares the 10% platform fee). EVERY licence is reviewed by the car OWNER together with
// the request — there is no platform-admin licence approval. The server re-validates
// everything — these checks are a UX fast path only (NFR-10).
import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import Image from "next/image";
import { requestBookingAction } from "@/actions/bookings";
import { computeTotals, formatETB, toISODate } from "@/lib/pricing";
import { RENTAL_TERMS_VERSION } from "@/lib/terms";
import { TermsDialog } from "@/components/terms-dialog";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/submit-button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, CalendarX, CarFront, CircleCheck, IdCard, UserRound, X } from "lucide-react";

type DriveMode = "SELF_DRIVE" | "OWN_DRIVER" | "OWNER_DRIVER";

type Props = {
  carId: string;
  pricePerDay: number;
  blockedDates: string[]; // ISO dates blocked by owner or active bookings
  signedIn: boolean;
  suspended?: boolean;
  discountPercent?: number | null; // live offer for this car — mirror of the server rule
  driverFeePerDay?: number | null; // FR-49: set → the owner offers a professional driver
};

// Resize any device photo to a small JPEG data URL (max 1280px edge, q0.82) so the
// request body stays tiny — same pipeline as the owner photo picker (13-n).
async function fileToDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  return canvas.toDataURL("image/jpeg", 0.82);
}

const MODES: { value: DriveMode; label: string; hint: string; icon: typeof CarFront }[] = [
  { value: "SELF_DRIVE", label: "I'll drive myself", hint: "Attach your driving licence — the owner checks it with your request.", icon: CarFront },
  { value: "OWN_DRIVER", label: "I'll bring my own driver", hint: "Attach the driver's licence photo + number with the request.", icon: IdCard },
  { value: "OWNER_DRIVER", label: "Use the owner's driver", hint: "Professional driver comes with the car — extra fee per day.", icon: UserRound },
];

export function BookingForm({ carId, pricePerDay, blockedDates, signedIn, suspended, discountPercent, driverFeePerDay }: Props) {
  const [state, formAction] = useActionState(requestBookingAction, {});
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [mode, setMode] = useState<DriveMode>("SELF_DRIVE");
  const [driverName, setDriverName] = useState("");
  const [driverLicenseNumber, setDriverLicenseNumber] = useState("");
  const [driverLicenseImage, setDriverLicenseImage] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  // FR-51 clickwrap: the request button opens the rental-rules dialog; only
  // "Agree & send request" submits the form. The agreed flag travels in an
  // UNCONTROLLED hidden input set synchronously at confirm time (state updates
  // are async — a setState + immediate requestSubmit would send the old value).
  const [termsOpen, setTermsOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const agreedRef = useRef<HTMLInputElement>(null);
  function confirmTerms() {
    if (agreedRef.current) agreedRef.current.value = "1";
    setTermsOpen(false);
    formRef.current?.requestSubmit();
  }
  const today = toISODate(new Date());

  useEffect(() => {
    if (state.error) toast.error(state.error);
  }, [state]);

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file after a remove
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Pick an image file (JPG or PNG).");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("That photo is too large — pick one under 8 MB.");
      return;
    }
    try {
      setDriverLicenseImage(await fileToDataUrl(file));
    } catch {
      toast.error("Could not read that image — try another file.");
    }
  }

  const blockedSet = new Set(blockedDates);
  const pct = Number.isFinite(discountPercent) && discountPercent! > 0 ? Math.min(Math.round(discountPercent!), 100) : 0;
  // The listing offers an owner driver (FR-49) — independent of the chosen mode.
  const driverOption = !!driverFeePerDay && driverFeePerDay > 0;
  const ownerDriver = mode === "OWNER_DRIVER" && driverOption; // the fee only applies IN that mode
  let check: { ok: boolean; msg: string; totals: ReturnType<typeof computeTotals> | null };
  {
    if (!start || !end) check = { ok: false, msg: "Pick both a start and a return date.", totals: null };
    else {
      const s = new Date(start + "T00:00:00.000Z");
      const e = new Date(end + "T00:00:00.000Z");
      if (s.getTime() < new Date(today + "T00:00:00.000Z").getTime()) check = { ok: false, msg: "The start date cannot be in the past.", totals: null };
      else if (e.getTime() < s.getTime()) check = { ok: false, msg: "The return date cannot be before the start date.", totals: null };
      else {
        let clash = false;
        for (let d = new Date(s); d.getTime() <= e.getTime(); d.setUTCDate(d.getUTCDate() + 1)) {
          if (blockedSet.has(toISODate(d))) { clash = true; break; }
        }
        if (clash) check = { ok: false, msg: "Some selected days are unavailable. Adjust your range.", totals: null };
        else check = { ok: true, msg: "", totals: computeTotals(pricePerDay, s, e, pct, ownerDriver ? driverFeePerDay! : 0)! };
      }
    }
  }

  // FR-49 client gates (the server repeats every one of these — NFR-10).
  // Turo-style: SELF_DRIVE needs the renter's own licence; OWN_DRIVER also names
  // the driver. Both licences travel with the request for the OWNER to review.
  const licenceOk = driverLicenseNumber.trim().length >= 4 && driverLicenseImage.length > 50;
  const driverOk = mode === "SELF_DRIVE" ? licenceOk : driverName.trim().length >= 2 && licenceOk;
  const modeOk = mode === "OWNER_DRIVER" ? driverOption : driverOk;
  const canSubmit = check.ok && modeOk && !suspended;

  if (!signedIn) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">Sign in as a demo renter to request this car.</p>
        <SubmitButton disabled>
          <CalendarX className="mr-2 h-4 w-4" /> Request booking
        </SubmitButton>
        <p className="text-sm">
          <Link href={`/signin?next=/cars/${carId}`} className="font-medium text-brand underline-offset-4 hover:underline">Sign in</Link> or{" "}
          <Link href="/signup" className="font-medium text-brand underline-offset-4 hover:underline">create an account</Link> to book.
        </p>
      </div>
    );
  }

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <input type="hidden" name="carId" value={carId} />
      {/* FR-51 clickwrap proof inputs — the server validates and stamps them. */}
      <input type="hidden" name="termsVersion" value={RENTAL_TERMS_VERSION} />
      <input type="hidden" name="termsAgreed" value="" ref={agreedRef} />
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="startDate">Pickup</Label>
          <Input id="startDate" name="startDate" type="date" min={today} value={start} onChange={(e) => setStart(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="endDate">Return</Label>
          <Input id="endDate" name="endDate" type="date" min={start || today} value={end} onChange={(e) => setEnd(e.target.value)} required />
        </div>
      </div>

      {check.msg && check.totals === null && (
        <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertDescription>{check.msg}</AlertDescription></Alert>
      )}

      {/* FR-49: how will you drive? The third option appears only when the owner
          set a driver fee on the listing. The server re-checks every gate (BR-11). */}
      <fieldset className="space-y-2 rounded-lg border p-3">
        <legend className="flex items-center gap-1.5 px-1 text-sm font-semibold"><CarFront className="h-4 w-4 text-brand" aria-hidden /> How will you drive?</legend>
        <div className="space-y-2" role="radiogroup" aria-label="Drive mode">
          {MODES.filter((m) => m.value !== "OWNER_DRIVER" || driverOption).map((m) => {
            const active = mode === m.value;
            return (
              <label
                key={m.value}
                className={`flex cursor-pointer items-start gap-2.5 rounded-lg border p-2.5 text-sm transition-colors ${active ? "border-brand bg-brand/5 ring-1 ring-brand" : "hover:bg-muted/50"}`}
              >
                <input
                  type="radio"
                  name="driveMode"
                  value={m.value}
                  checked={active}
                  onChange={() => setMode(m.value)}
                  className="mt-0.5 h-4 w-4 accent-[var(--brand,#0f766e)]"
                  aria-describedby={`mode-hint-${m.value}`}
                />
                <span className="flex-1">
                  <span className="flex items-center gap-1.5 font-medium"><m.icon className="h-4 w-4 text-brand" aria-hidden /> {m.label}</span>
                  <span id={`mode-hint-${m.value}`} className="mt-0.5 block text-xs text-muted-foreground">
                    {m.value === "OWNER_DRIVER" ? `+${formatETB(driverFeePerDay ?? 0)} per day — added to your total.` : m.hint}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {/* FR-49 licence covering whoever drives (Turo-style): SELF_DRIVE → the
          renter's own licence; OWN_DRIVER → the brought driver's licence. It
          travels with the request and the OWNER approves/rejects it — there is
          no platform-admin licence approval. */}
      {mode !== "OWNER_DRIVER" && (
        <fieldset className="space-y-2 rounded-lg border p-3">
          <legend className="flex items-center gap-1.5 px-1 text-sm font-semibold"><IdCard className="h-4 w-4 text-brand" aria-hidden /> {mode === "SELF_DRIVE" ? "Your driving licence" : "Your driver"}</legend>
          <p className="text-xs text-muted-foreground">The owner checks this licence before approving your request.</p>
          {mode === "OWN_DRIVER" && (
            <div className="space-y-1.5">
              <Label htmlFor="driverName">Driver&apos;s full name</Label>
              <Input
                id="driverName"
                name="driverName"
                autoComplete="off"
                placeholder="e.g. Bekele Ayana"
                minLength={2}
                maxLength={80}
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="driverLicenseNumber">{mode === "SELF_DRIVE" ? "Your licence number" : "Driver's licence number"}</Label>
            <Input
              id="driverLicenseNumber"
              name="driverLicenseNumber"
              inputMode="text"
              autoComplete="off"
              placeholder="e.g. ET-DM-0031452"
              minLength={4}
              maxLength={40}
              value={driverLicenseNumber}
              onChange={(e) => setDriverLicenseNumber(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="driverLicenseImageFile">{mode === "SELF_DRIVE" ? "Your licence photo" : "Driver's licence photo"}</Label>
            {driverLicenseImage ? (
              <div className="flex items-center gap-3">
                <Image src={driverLicenseImage} alt="Driving licence" width={64} height={48} unoptimized className="h-12 w-16 rounded-md border object-cover" />
                <p className="flex-1 text-xs text-muted-foreground">Attached — the owner will see this with your request.</p>
                <button type="button" onClick={() => setDriverLicenseImage("")} aria-label="Remove licence photo" className="rounded-md border p-1.5 text-muted-foreground hover:bg-muted">
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </div>
            ) : (
              <>
                <input
                  ref={fileRef}
                  id="driverLicenseImageFile"
                  type="file"
                  accept="image/*"
                  onChange={onPickFile}
                  className="w-full cursor-pointer rounded-md border border-input bg-background text-sm file:mr-3 file:cursor-pointer file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-muted/80"
                />
                <p className="text-xs text-muted-foreground">JPG or PNG. Large phone photos are resized automatically in your browser.</p>
              </>
            )}
          </div>
          {/* The action contract: the data URL travels in this hidden input. */}
          <input type="hidden" name="driverLicenseImage" value={driverLicenseImage} />
        </fieldset>
      )}

      {check.totals && (
        <div className="space-y-1 rounded-lg border bg-muted/40 p-3 text-sm" aria-live="polite">
          <p className="flex justify-between"><span>{check.totals.days} day{check.totals.days > 1 ? "s" : ""} × {formatETB(pricePerDay)}</span><span>{formatETB(check.totals.subtotal)}</span></p>
          {check.totals.discountPercent > 0 && (
            <p className="flex items-center justify-between font-medium text-brand">
              <span className="flex items-center gap-1.5">
                <span className="rounded-full bg-brand px-1.5 py-0.5 text-[10px] font-extrabold text-brand-foreground">−{check.totals.discountPercent}%</span>
                Live offer
              </span>
              <span>−{formatETB(check.totals.discountAmount)}</span>
            </p>
          )}
          {ownerDriver && (
            <p className="flex justify-between"><span className="flex items-center gap-1.5"><UserRound className="h-3.5 w-3.5 text-brand" aria-hidden /> Owner&apos;s driver · {check.totals.days} day{check.totals.days > 1 ? "s" : ""} × {formatETB(check.totals.driverFeePerDay)}</span><span>{formatETB(check.totals.driverTotal)}</span></p>
          )}
          <p className="flex justify-between text-muted-foreground"><span>Platform fee (10%)</span><span>{formatETB(check.totals.fee)}</span></p>
          <p className="flex justify-between border-t pt-1 font-semibold"><span>Total</span><span>{formatETB(check.totals.total)}</span></p>
          <p className="pt-1 text-xs text-muted-foreground">This exact total is snapshotted at request time — later price edits never change it (BR-03). The 10% fee applies to the overall booking price, including the driver fee.</p>
        </div>
      )}

      <Button
        type="button"
        disabled={!canSubmit}
        onClick={() => setTermsOpen(true)}
        className="w-full sm:w-auto"
      >
        <CircleCheck className="mr-2 h-4 w-4" />
        Request booking
      </Button>
      <TermsDialog open={termsOpen} onOpenChange={setTermsOpen} kind="rental" driveMode={mode} onConfirm={confirmTerms} />
      {state.ok && state.message && <p className="text-sm text-brand">{state.message}</p>}
      {suspended && <p className="text-sm text-red-600">Your account is suspended — actions are disabled (FR-06).</p>}
      <p className="text-xs text-muted-foreground">You will not be charged until the owner approves and you complete the escrow checkout.</p>
    </form>
  );
}
