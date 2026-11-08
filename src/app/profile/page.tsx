// Profile: the renter's account summary. There is NO platform-admin licence
// approval in this project (FR-49, Turo-style): the driving licence is attached
// to EACH booking request and reviewed by the car OWNER together with it.
import Link from "next/link";
import { apiGet } from "@/lib/api";
import { requireActiveUser } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IdCard, UserRound } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "My profile" };

export default async function ProfilePage() {
  const session = await requireActiveUser();
  const { user } = await apiGet<{ user: { name: string; email: string; phone: string | null; roles: string[] } }>("/api/view/profile");
  if (!user) return null;

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <header>
        <h1 className="text-2xl font-bold">My profile</h1>
        <p className="text-sm text-muted-foreground">Your account details and how licences work on Sheggar Wheels.</p>
      </header>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base"><IdCard className="h-4 w-4 text-brand" aria-hidden /> Driving licence</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="text-muted-foreground">
            You do not upload a licence here. Every booking request carries the licence of whoever
            drives — yours for self-drive, your driver&apos;s when you bring one — and the car owner
            approves or rejects it together with the request (FR-49). Nothing is decided by a
            platform admin in advance.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><UserRound className="h-4 w-4 text-brand" aria-hidden /> Account</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="flex justify-between"><span className="text-muted-foreground">Name</span><span className="font-medium">{user.name}</span></p>
          <p className="flex justify-between"><span className="text-muted-foreground">Email</span><span>{user.email}</span></p>
          <p className="flex justify-between"><span className="text-muted-foreground">Phone</span><span>{user.phone ?? "—"}</span></p>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Roles</span>
            <span className="flex gap-1.5">{user.roles.map((r) => <Badge key={r} variant="secondary">{r.toLowerCase()}</Badge>)}</span>
          </div>
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        <Link href="/cars" className="text-brand hover:underline">Browse cars →</Link>
        <span className="mx-2" aria-hidden>·</span>
        The 10% platform fee applies to every booking — including any owner-driver fee.
      </p>
    </div>
  );
}
