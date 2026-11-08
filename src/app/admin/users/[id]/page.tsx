// Single demo user detail (FR-41).
import Link from "next/link";
import { notFound } from "next/navigation";
import { apiGetOr404 } from "@/lib/api";
import { requireActiveUser } from "@/lib/auth";
import { formatDate } from "@/lib/pricing";
import { suspendUserAction, reinstateUserAction } from "@/actions/platform";
import { SubmitButton } from "@/components/submit-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookingStatusBadge } from "@/components/status-badges";
import { UserStatus } from "@/lib/domain";

export const dynamic = "force-dynamic";

export default async function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = await requireActiveUser();
  const data = await apiGetOr404<{ user: import("@/lib/domain").User }>(`/api/view/admin/users/${id}`);
  const user = data.user;
  const renterBookings = user.renterBookings ?? [];
  const cars = user.cars ?? [];

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-8">
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground"><Link href="/admin/users" className="hover:text-foreground">Demo users</Link> <span aria-hidden>/</span> {user.name}</nav>
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">{user.name} {user.status === UserStatus.SUSPENDED && <Badge className="bg-red-100 text-red-800 hover:bg-red-100" variant="secondary">suspended</Badge>}</CardTitle>
          <p className="text-sm text-muted-foreground">{user.email} · {user.phone ?? "no phone"} · joined {formatDate(user.createdAt)}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-1">{user.roles.map((r) => <Badge key={r} variant="secondary">{r.toLowerCase()}</Badge>)}</div>
          {admin.id !== user.id && !user.roles.includes("ADMIN") && (
            user.status === UserStatus.ACTIVE ? (
              <form action={suspendUserAction}><input type="hidden" name="userId" value={user.id} /><SubmitButton size="sm" variant="outline">Suspend account</SubmitButton></form>
            ) : (
              <form action={reinstateUserAction}><input type="hidden" name="userId" value={user.id} /><SubmitButton size="sm" className="bg-brand text-brand-foreground hover:bg-brand/90">Reinstate account</SubmitButton></form>
            )
          )}
          {user.roles.includes("ADMIN") && <p className="text-xs text-muted-foreground">Admin accounts cannot be suspended (BR-08).</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Recent bookings as renter</CardTitle></CardHeader>
        <CardContent className="p-0">
          {renterBookings.length === 0 ? <p className="p-4 text-sm text-muted-foreground">None.</p> : (
            <ul className="divide-y text-sm">
              {renterBookings.map((b) => (
                <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
                  <Link href={"/bookings/" + b.id} className="font-medium hover:underline">{b.car.make} {b.car.model}</Link>
                  <BookingStatusBadge status={b.status} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {cars.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Listings</CardTitle></CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y text-sm">
              {cars.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-2 p-3"><span className="font-medium">{c.make} {c.model}</span><Badge variant="secondary">{c.status.toLowerCase()}</Badge></li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
