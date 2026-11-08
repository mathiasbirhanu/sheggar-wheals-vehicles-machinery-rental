import { ShieldAlert } from "lucide-react";
import { signOutAction } from "@/actions/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SubmitButton } from "@/components/submit-button";

export const metadata = { title: "Account suspended" };

export default async function SuspendedPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <Card className="border-red-200 dark:border-red-900">
        <CardHeader className="items-center text-center">
          <ShieldAlert className="mb-2 h-12 w-12 text-red-500" aria-hidden />
          <CardTitle className="text-xl">Account suspended (FR-06)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center text-sm text-muted-foreground">
          <p>
            Your account has been suspended by a platform administrator. While suspended you cannot browse protected pages, request bookings, manage listings, or perform any other demo action (BR-10).
          </p>
          <p>If you believe this is a mistake, contact the platform admin.</p>
          <form action={signOutAction}>
            <SubmitButton variant="outline">Sign out</SubmitButton>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
