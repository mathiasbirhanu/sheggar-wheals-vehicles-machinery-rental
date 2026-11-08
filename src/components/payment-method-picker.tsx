"use client";
// Payment method picker (FR-23): card-style radio group fed by lib/payments.ts.
// The detail input re-mounts per method (key={method.id}) so its default value
// swaps cleanly. Without JS, TeleBirr stays the default-checked method and the
// form still submits a valid method — progressive enhancement, same as the
// rest of the app.
import { useState } from "react";
import { Check } from "lucide-react";
import { PAYMENT_METHODS, type PaymentMethodId } from "@/lib/payments";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export function PaymentMethodPicker({ defaultMethod = "telebirr", userPhone = "" }: { defaultMethod?: PaymentMethodId; userPhone?: string }) {
  const [method, setMethod] = useState<PaymentMethodId>(defaultMethod);
  const active = PAYMENT_METHODS.find((m) => m.id === method) ?? PAYMENT_METHODS[0];
  const isWallet = active.id !== "chapa";

  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-semibold">Choose how to pay</legend>
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Payment method">
        {PAYMENT_METHODS.map((pm) => {
          const selected = pm.id === method;
          return (
            <label
              key={pm.id}
              className={`relative flex cursor-pointer flex-col gap-1.5 rounded-xl border p-3 transition-colors duration-200 ${
                selected ? "border-brand bg-brand/5 ring-1 ring-brand" : "hover:border-foreground/25"
              }`}
            >
              <input type="radio" name="method" value={pm.id} checked={selected} onChange={() => setMethod(pm.id)} className="sr-only" />
              <span aria-hidden className="flex items-center justify-between">
                <span className={`grid h-8 w-8 place-items-center rounded-lg text-[11px] font-extrabold tracking-tight text-white ${pm.markClass}`}>{pm.mark}</span>
                {selected && <Check className="h-4 w-4 text-brand" />}
              </span>
              <span className="text-sm font-bold leading-none">{pm.label}</span>
              <span className="text-[11px] leading-snug text-muted-foreground">{pm.tagline}</span>
            </label>
          );
        })}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="contact">{active.contactLabel}</Label>
        <Input
          key={active.id}
          id="contact"
          name="contact"
          type="text"
          inputMode={isWallet ? "tel" : "text"}
          autoComplete={isWallet ? "tel" : "email"}
          placeholder={active.contactPlaceholder}
          defaultValue={isWallet ? userPhone : ""}
          required
        />
        <p className="text-xs leading-snug text-muted-foreground">{active.contactHint}</p>
      </div>
    </fieldset>
  );
}
