import Link from "next/link";
import { redirect } from "next/navigation";
import { apiGet } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SignUpForm } from "@/components/sign-up-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sign up" };

export default async function SignUpPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");
  const { enabled } = await apiGet<{ enabled: boolean }>("/api/auth/google-enabled");
  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Create your account</CardTitle>
          <CardDescription>Join the Addis Ababa peer-to-peer marketplace as a renter — or as an owner too. A strong password keeps your bookings safe.</CardDescription>
        </CardHeader>
        <CardContent><SignUpForm googleEnabled={enabled} /></CardContent>
      </Card>
      <p className="text-center text-sm text-muted-foreground">
        Already registered? <Link href="/signin" className="font-medium text-brand underline-offset-4 hover:underline">Sign in</Link>
      </p>
    </div>
  );
}
