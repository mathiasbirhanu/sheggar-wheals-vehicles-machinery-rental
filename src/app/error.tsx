"use client";
// Route-segment error boundary (NFR resilience): branded, actionable, recoverable.
// Server action failures and render errors land here instead of a white screen.
import { useEffect } from "react";
import { RefreshCw, Home, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Replace with a real reporter (Sentry, Axiom…) in production telemetry.
    console.error("[sheggar-wheels] unhandled route error:", error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-950">
        <AlertTriangle className="h-7 w-7 text-orange-600 dark:text-orange-400" aria-hidden />
      </div>
      <h1 className="text-xl font-bold">Something went wrong</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        We hit an unexpected error while loading this page. Your data is safe — bookings and payments
        are recorded server-side. Try again, or head back to the catalogue.
      </p>
      {error.digest && (
        <p className="mt-2 font-mono text-xs text-muted-foreground/70">ref: {error.digest}</p>
      )}
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Button onClick={reset} size="sm">
          <RefreshCw className="mr-2 h-4 w-4" aria-hidden /> Try again
        </Button>
        <Button asChild size="sm" variant="outline">
          <a href="/cars">Browse cars</a>
        </Button>
        <Button asChild size="sm" variant="ghost">
          <a href="/">
            <Home className="mr-2 h-4 w-4" aria-hidden /> Home
          </a>
        </Button>
      </div>
    </div>
  );
}
