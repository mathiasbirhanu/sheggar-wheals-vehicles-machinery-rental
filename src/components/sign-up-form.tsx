"use client";
// Sign-up (v3): account creation requires a STRONG password, typed twice.
// The live checklist and the server's zod schema share one rule engine
// (lib/password-policy), so what the user sees ticked green is exactly what
// the server enforces on submit. Google OAuth is unchanged.
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import { signUpAction } from "@/actions/auth";
import { SubmitButton } from "@/components/submit-button";
import { GoogleButton } from "@/components/google-button";
import { PasswordInput } from "@/components/password-input";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { passwordChecks, passwordStrength } from "@/lib/password-policy";
import { DocPicker } from "@/components/doc-picker";
import type { ActionState } from "@/lib/validation";

// All 6 rules are mandatory on the server, so the label only says "Strong"
// at 6/6 — anything short of that is still fixable and shown accordingly.
const METER_STYLES = [
  { width: "8%", bg: "bg-red-500", label: "Too weak", text: "text-red-600" },
  { width: "20%", bg: "bg-red-500", label: "Very weak", text: "text-red-600" },
  { width: "35%", bg: "bg-red-500", label: "Weak", text: "text-red-600" },
  { width: "50%", bg: "bg-red-500", label: "Weak", text: "text-red-600" },
  { width: "65%", bg: "bg-amber-500", label: "Fair", text: "text-amber-600" },
  { width: "85%", bg: "bg-amber-500", label: "Almost there", text: "text-amber-600" },
  { width: "100%", bg: "bg-green-600", label: "Strong", text: "text-green-700" },
];

export function SignUpForm({ googleEnabled }: { googleEnabled?: boolean }) {
  const [state, formAction] = useActionState<ActionState, FormData>(signUpAction, {});
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [asOwner, setAsOwner] = useState(false); // FR-48: reveals the optional licence upload
  useEffect(() => { if (state.error) toast.error(state.error); }, [state]);

  const checks = passwordChecks(password);
  const { score, total } = passwordStrength(password);
  const meter = METER_STYLES[score];
  const mismatch = confirm.length > 0 && password !== confirm;

  return (
    <div className="space-y-4">
      {googleEnabled && (
        <div className="space-y-3">
          <GoogleButton next="/dashboard" />
          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs uppercase text-muted-foreground">or sign up with email</span>
            <span className="h-px flex-1 bg-border" />
          </div>
        </div>
      )}
      <form action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="name">Full name</Label>
        <Input id="name" name="name" placeholder="Abebe Kebede" required minLength={2} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" placeholder="abebe@example.com" required autoComplete="email" />
        <p className="text-xs text-muted-foreground">Must be unique — duplicates are refused (BR-01).</p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="phone">Phone (optional)</Label>
        <Input id="phone" name="phone" type="tel" placeholder="+251 911 234 567" />
      </div>

      <PasswordInput
        id="password"
        label="Password"
        autoComplete="new-password"
        placeholder="Create a strong password"
        required
        value={password}
        onChange={setPassword}
      />

      {/* Live strength meter + rule checklist — same rules the server enforces. */}
      {password.length > 0 && (
        <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
          <div className="flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
              <div className={`h-full rounded-full transition-all ${meter.bg}`} style={{ width: meter.width }} />
            </div>
            <span className={`text-xs font-medium ${meter.text}`}>{meter.label}</span>
          </div>
          <ul className="grid gap-1 sm:grid-cols-2">
            {checks.map((c) => (
              <li key={c.id} className={`flex items-center gap-1.5 text-xs ${c.ok ? "text-green-700" : "text-muted-foreground"}`}>
                {c.ok ? <Check className="h-3.5 w-3.5 shrink-0 text-green-600" /> : <X className="h-3.5 w-3.5 shrink-0 text-red-400" />}
                {c.label}
              </li>
            ))}
          </ul>
        </div>
      )}

      <PasswordInput
        id="confirmPassword"
        label="Confirm password"
        autoComplete="new-password"
        placeholder="Re-type the password"
        required
        value={confirm}
        onChange={setConfirm}
        hint={mismatch ? "Passwords do not match yet." : undefined}
      />

      <div className="flex items-start gap-2 rounded-lg border p-3">
        <Checkbox id="asOwner" name="asOwner" className="mt-0.5" checked={asOwner} onCheckedChange={(v) => setAsOwner(v === true)} />
        <div>
          <Label htmlFor="asOwner" className="font-normal">I also want to list my car</Label>
          <p className="text-xs text-muted-foreground">Adds the owner role to your account — one account can be both renter and owner (FR-04). Listings require admin approval.</p>
        </div>
      </div>

      {/* FR-48: legal rental licence — OPTIONAL. Signup never blocks on it. */}
      {asOwner && (
        <DocPicker
          name="rentalLicenseDoc"
          label="Legal rental licence (business licence)"
          description="If you already hold a rental / business licence, upload a photo or scan now. You can also skip this and add it later — your account works either way."
        />
      )}
      <SubmitButton className="w-full bg-brand text-brand-foreground hover:bg-brand/90">Create account</SubmitButton>
      <p className="text-xs text-muted-foreground">
        Your password is hashed with scrypt before storage — the plaintext is never saved or logged.
      </p>
    </form>
    </div>
  );
}
