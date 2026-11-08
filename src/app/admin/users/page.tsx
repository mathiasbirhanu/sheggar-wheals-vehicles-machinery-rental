// User management (FR-41, BR-10): suspend / reinstate demo accounts.
import Link from "next/link";
import { apiGet } from "@/lib/api";
import { requireActiveUser } from "@/lib/auth";
import { formatDate } from "@/lib/pricing";
import { suspendUserAction, reinstateUserAction } from "@/actions/platform";
import { SubmitButton } from "@/components/submit-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";
export const metadata = { title: "Manage users" };

export default async function AdminUsersPage() {
  const admin = await requireActiveUser();
  const data = await apiGet<{ users: { user: import("@/lib/domain").User; renterBookingsCount: number; carsCount: number }[] }>("/api/view/admin/users");
  const users = data.users.map((u) => ({ ...u.user, _count: { renterBookings: u.renterBookingsCount, cars: u.carsCount } }));

  return (
    <div className="mx-auto max-w-4xl space-y-4 px-4 py-8">
      <h1 className="text-2xl font-bold">Demo users</h1>
      <p className="text-sm text-muted-foreground">Suspended accounts are blocked from every demo action until reinstated (FR-06, BR-10). Admin accounts cannot be suspended.</p>
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">Demo users with roles, status, and controls</caption>
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th scope="col" className="p-3 font-medium">User</th>
                  <th scope="col" className="p-3 font-medium">Roles</th>
                  <th scope="col" className="p-3 font-medium">Joined</th>
                  <th scope="col" className="p-3 font-medium">Activity</th>
                  <th scope="col" className="p-3 text-right font-medium">Controls</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b last:border-0">
                    <td className="p-3">
                      <Link href={"/admin/users/" + u.id} className="font-medium hover:underline">{u.name}</Link>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </td>
                    <td className="p-3"><div className="flex flex-wrap gap-1">{u.roles.map((r) => <Badge key={r} variant="secondary" className="text-[10px]">{r.toLowerCase()}</Badge>)}{u.status === "SUSPENDED" && <Badge className="bg-red-100 text-red-800 hover:bg-red-100 text-[10px]" variant="secondary">suspended</Badge>}</div></td>
                    <td className="p-3 text-muted-foreground">{formatDate(u.createdAt)}</td>
                    <td className="p-3 text-muted-foreground">{u._count.renterBookings} bookings · {u._count.cars} cars</td>
                    <td className="p-3 text-right">
                      {u.id !== admin.id && !u.roles.includes("ADMIN") && (
                        u.status === "ACTIVE" ? (
                          <form action={suspendUserAction} className="inline"><input type="hidden" name="userId" value={u.id} /><SubmitButton size="sm" variant="outline">Suspend</SubmitButton></form>
                        ) : (
                          <form action={reinstateUserAction} className="inline"><input type="hidden" name="userId" value={u.id} /><SubmitButton size="sm" variant="secondary">Reinstate</SubmitButton></form>
                        )
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      <p className="text-sm text-muted-foreground"><Link href="/admin" className="text-brand hover:underline">← Admin console</Link></p>
    </div>
  );
}
