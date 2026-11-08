"use client";
// FR-51 — TERMS DIALOG (clickwrap): the attractive gate in front of the two
// contract moments — "Request booking" (rental rules) and checkout "Pay"
// (payment & escrow terms). The confirm button stays DISABLED until the
// checkbox is ticked, which is what makes the acceptance legally meaningful.
// The dialog owns only its checkbox; the PARENT decides what "confirm" does
// (submit the real form). Cancelling or Escape resets the checkbox — a fresh
// affirmative action is required on every attempt.
import { useEffect, useState } from "react";
import {
  CalendarClock, CarFront, Clock, EyeOff, FlaskConical, Fuel, IdCard, KeyRound, Lock,
  RotateCcw, Scale, ShieldCheck, TriangleAlert, UserRound, Wallet,
  type LucideIcon,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  MODE_RULES, PAYMENT_TERMS_VERSION, PAYMENT_RULES, RENTAL_TERMS_VERSION, RENTAL_RULES,
  type TermIcon, type TermRule,
} from "@/lib/terms";

const ICONS: Record<TermIcon, LucideIcon> = {
  key: KeyRound, fuel: Fuel, shield: ShieldCheck, clock: Clock, calendar: CalendarClock,
  id: IdCard, user: UserRound, steering: CarFront, wallet: Wallet, lock: Lock,
  refund: RotateCcw, eyeoff: EyeOff, flask: FlaskConical, alert: TriangleAlert,
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: "rental" | "payment";
  /** Rental kind only: the currently chosen drive mode picks the extra rule. */
  driveMode?: "SELF_DRIVE" | "OWN_DRIVER" | "OWNER_DRIVER";
  /** Called ONLY when the user ticks the box and presses confirm. */
  onConfirm: () => void;
};

export function TermsDialog({ open, onOpenChange, kind, driveMode, onConfirm }: Props) {
  const [checked, setChecked] = useState(false);

  // Fresh affirmative action per attempt: reopening always starts unticked.
  useEffect(() => {
    if (!open) setChecked(false);
  }, [open]);

  const isRental = kind === "rental";
  const rules: TermRule[] = isRental
    ? [...RENTAL_RULES, MODE_RULES[driveMode ?? "SELF_DRIVE"]]
    : PAYMENT_RULES;
  const version = isRental ? RENTAL_TERMS_VERSION : PAYMENT_TERMS_VERSION;
  const title = isRental ? "Rental rules & agreement" : "Payment terms & escrow agreement";
  const description = isRental
    ? "The house rules for this trip. Read them once — they travel with every booking."
    : "What happens with your money: the fee, the escrow hold and your refunds.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg gap-0 overflow-hidden p-0">
        {/* Brand header */}
        <DialogHeader className="gap-2 border-b bg-gradient-to-br from-brand/10 via-brand/5 to-transparent p-5 text-left">
          <DialogTitle className="flex items-center gap-2.5 text-lg">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand text-brand-foreground" aria-hidden>
              <Scale className="h-5 w-5" />
            </span>
            {title}
            <span className="ml-auto rounded-full border border-brand/30 bg-brand/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand">Terms {version}</span>
          </DialogTitle>
          <DialogDescription className="pl-[46px] text-sm">{description}</DialogDescription>
        </DialogHeader>

        {/* Scrollable rules */}
        <ol className="max-h-[46vh] space-y-3 overflow-y-auto p-5" aria-label="Rules list">
          {rules.map((rule, i) => {
            const highlighted = isRental && i === rules.length - 1; // the mode-specific rule
            const Icon = ICONS[rule.icon];
            return (
              <li
                key={rule.title}
                className={`flex gap-3 rounded-xl border p-3 ${highlighted ? "border-brand/30 bg-brand/5" : "bg-muted/30"}`}
              >
                <span className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg ${highlighted ? "bg-brand text-brand-foreground" : "bg-background text-brand ring-1 ring-brand/25"}`} aria-hidden>
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="flex items-baseline gap-1.5 text-sm font-semibold">
                    <span className="text-[10px] font-extrabold text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                    {rule.title}
                  </span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">{rule.body}</span>
                </span>
              </li>
            );
          })}
        </ol>

        {/* Consent + actions */}
        <DialogFooter className="flex-col gap-3 border-t bg-muted/30 p-4 sm:justify-between">
          <div className="flex items-start gap-2.5 text-left">
            <Checkbox id={`terms-${kind}`} checked={checked} onCheckedChange={(v) => setChecked(v === true)} className="mt-0.5" />
            <Label htmlFor={`terms-${kind}`} className="cursor-pointer text-xs leading-snug font-normal">
              I have read and agree to the {isRental ? "rental rules" : "payment & escrow terms"} (version {version}).
            </Label>
          </div>
          <div className="flex w-full gap-2 sm:w-auto">
            <Button type="button" variant="ghost" className="flex-1 sm:flex-none" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!checked}
              className="flex-1 bg-brand text-brand-foreground hover:bg-brand/90 sm:flex-none"
              onClick={onConfirm}
            >
              {isRental ? "Agree & send request" : "Agree & pay"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
