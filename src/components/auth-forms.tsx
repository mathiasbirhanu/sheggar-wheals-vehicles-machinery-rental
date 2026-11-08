"use client";
// Sign-in (v3): email + password (FR-02). The seeded demo accounts are now
// one-click FILL buttons — they drop the account's email and the shared demo
// password into the form so the examiner still gets a fast demo, but every
// sign-in goes through the real password check. Google OAuth is unchanged.
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { signInAction } from "@/actions/auth";
import { SubmitButton } from "@/components/submit-button";
import { GoogleButton } from "@/components/google-button";
import { PasswordInput } from "@/components/password-input";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DEMO_ACCOUNT_PASSWORD } from "@/lib/password-policy";
import type { ActionState } from "@/lib/validation";
import type { Role } from "@/lib/domain";

export type DemoAccount = { email: string; name: string; roles: Role[] };

export function SignInForm({ accounts, next, googleEnabled }: { accounts: DemoAccount[]; next?: string; googleEnabled?: boolean }) {
  const [state, formAction] = useActionState<ActionState, FormData>(signInAction, {});
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  useEffect(() => { if (state.error) toast.error(state.error); }, [state]);

  /** One click fills BOTH credentials — the user still presses "Sign in" so the password check runs for real. */
  const fillDemo = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword(DEMO_ACCOUNT_PASSWORD);
    toast.info("Demo account filled — press Sign in.");
  };

  return (
    <div className="space-y-6">
      {googleEnabled && (
        <div className="space-y-3">
          <GoogleButton next={next} />
          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs uppercase text-muted-foreground">or sign in with email</span>
            <span className="h-px flex-1 bg-border" />
          </div>
        </div>
      )}
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="next" value={next ?? ""} />
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="you@example.com"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <PasswordInput
          id="password"
          label="Password"
          autoComplete="current-password"
          placeholder="Your password"
          required
          value={password}
          onChange={setPassword}
        />
        <SubmitButton className="w-full bg-brand text-brand-foreground hover:bg-brand/90">Sign in</SubmitButton>
      </form>

      {/* Demo section only when demo accounts actually exist — a wiped/production
          DB would otherwise advertise a demo password that matches nothing. */}
      {accounts.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Seeded demo accounts (one click fills the form):</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {accounts.map((a) => (
              <button
                key={a.email}
                type="button"
                onClick={() => fillDemo(a.email)}
                className="w-full rounded-lg border p-3 text-left text-sm transition-colors hover:border-brand/50 hover:bg-brand/5"
              >
                <p className="font-medium">{a.name}</p>
                <p className="text-xs text-muted-foreground">{a.email}</p>
                <p className="mt-1 flex gap-1">{a.roles.map((r) => <Badge key={r} variant="secondary" className="text-[10px]">{r.toLowerCase()}</Badge>)}</p>
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            All seeded accounts share the demo password:{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{DEMO_ACCOUNT_PASSWORD}</code>
            . A suspended seeded account is intentionally excluded from this list.
          </p>
        </div>
      )}
    </div>
  );
}
