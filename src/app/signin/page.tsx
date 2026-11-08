import Link from "next/link";
import { redirect } from "next/navigation";
import { apiGet } from "@/lib/api";
import { getCurrentUser, safeReturnPath } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SignInForm } from "@/components/auth-forms";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sign in" };

// Friendly messages for the OAuth round-trip (set by the /api/auth/google routes).
const OAUTH_ERRORS: Record<string, string> = {
  google_denied: "Google sign-in was cancelled — no worries, try again any time.",
  google_state: "That sign-in link expired or was already used. Please start again.",
  google_exchange: "Google could not confirm the sign-in. Please try again.",
  google_unverified: "Your Google account's email is not verified, so we can't use it to sign in.",
  google_failed: "Google sign-in hit an unexpected error. Please try again.",
  google_not_configured: "Google sign-in is not configured on this server — ask the admin to set GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET.",
  google_slow_down: "Too many Google sign-in attempts — wait a moment and try again.",
};

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  const user = await getCurrentUser();
  if (user) redirect(safeReturnPath(next));
  const oauthError = error ? OAUTH_ERRORS[error] : undefined;

  // Demo buttons list ONLY the seeded password accounts (the same filter as before,
  // now executed by the C# API in /api/view/signin).
  const { accounts, googleEnabled } = await apiGet<{
    accounts: { email: string; name: string; roles: import("@/lib/domain").Role[] }[];
    googleEnabled: boolean;
  }>("/api/view/signin");

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Welcome back</CardTitle>
          <CardDescription>Sign in to request cars, manage listings, and track trips.</CardDescription>
        </CardHeader>
        <CardContent>
          {oauthError && (
            <div role="alert" className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {oauthError}
            </div>
          )}
          <SignInForm accounts={accounts} next={next} googleEnabled={googleEnabled} />
        </CardContent>
      </Card>
      <p className="text-center text-sm text-muted-foreground">
        New here? <Link href="/signup" className="font-medium text-brand underline-offset-4 hover:underline">Create an account</Link>
      </p>
    </div>
  );
}
