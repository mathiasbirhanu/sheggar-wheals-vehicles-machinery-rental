"use client";
// FR-51 — checkout pay button gated by the payment & escrow terms dialog.
// Lives INSIDE the checkout ActionForm so its hidden inputs are part of the
// submitted FormData and useFormStatus still shows the pending spinner.
// On confirm the uncontrolled agreed input is set synchronously, then the
// surrounding form is submitted — same pattern as the booking form.
import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TermsDialog } from "@/components/terms-dialog";
import { PAYMENT_TERMS_VERSION } from "@/lib/terms";

export function PaymentTermsButton({ total }: { total: string }) {
  const [open, setOpen] = useState(false);
  const agreedRef = useRef<HTMLInputElement>(null);
  const { pending } = useFormStatus();

  function confirmTerms() {
    if (agreedRef.current) agreedRef.current.value = "1";
    setOpen(false);
    (document.getElementById("checkout-form") as HTMLFormElement | null)?.requestSubmit();
  }

  return (
    <>
      {/* FR-51 clickwrap proof inputs — the server validates and stamps them. */}
      <input type="hidden" name="paymentTermsVersion" value={PAYMENT_TERMS_VERSION} />
      <input type="hidden" name="paymentTermsAgreed" value="" ref={agreedRef} />
      <Button
        type="button"
        onClick={() => setOpen(true)}
        disabled={pending}
        className="w-full bg-brand text-brand-foreground hover:bg-brand/90"
      >
        {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
        Pay {total} securely
      </Button>
      <TermsDialog open={open} onOpenChange={setOpen} kind="payment" onConfirm={confirmTerms} />
    </>
  );
}
