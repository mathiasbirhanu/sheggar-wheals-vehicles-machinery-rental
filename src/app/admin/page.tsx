// Admin overview (FR-40/44): platform metrics.
import Link from "next/link";
import { apiGet } from "@/lib/api";
import { requireActiveUser } from "@/lib/auth";
import { formatETB } from "@/lib/pricing";
import { Card, CardContent } from "@/components/ui/card";
import { CarFront, ClipboardList, Users, Scale, Wallet, PiggyBank } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin" };

export default async function AdminPage() {
  const { pendingCars, totalCars, users, openDisputes, bookings, gmv, heldCount, heldTotal, platformIncome } = await apiGet<{
    pendingCars: number; totalCars: number; users: number; openDisputes: number; bookings: number;
    gmv: number; heldCount: number; heldTotal: number; platformIncome: number;
  }>("/api/view/admin");
  const heldRows = { length: heldCount };

  const tiles = [
    { href: "/admin/listings", icon: CarFront, label: "Listings awaiting moderation", value: pendingCars, hint: `${totalCars} total` },
    { href: "/admin/users", icon: Users, label: "Demo users", value: users, hint: "suspension controls" },
    { href: "/admin/bookings", icon: ClipboardList, label: "All bookings", value: bookings, hint: formatETB(gmv) + " completed GMV" },
    { href: "/admin/earnings", icon: PiggyBank, label: "Income dashboard", value: formatETB(platformIncome), hint: "platform fees vs owner payouts, by month" },
    { href: "/admin/bookings?payment=held", icon: Wallet, label: "Payments held in escrow", value: heldRows.length, hint: formatETB(heldTotal) + " awaiting release" },
    { href: "/admin/disputes", icon: Scale, label: "Open disputes", value: openDisputes, hint: "resolve with notes" },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <header>
        <h1 className="text-2xl font-bold">Admin console</h1>
        <p className="text-sm text-muted-foreground">Moderation, user management, dispute resolution, and platform reporting. Admin capability exists only on the seeded admin account (BR-08).</p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2">
        {tiles.map((t) => (
          <Link key={t.label} href={t.href} className="transition-transform hover:scale-[1.01]">
            <Card>
              <CardContent className="flex items-center gap-4 p-5">
                <t.icon className="h-9 w-9 text-brand" aria-hidden />
                <div>
                  <p className="text-2xl font-bold leading-tight">{t.value}</p>
                  <p className="text-sm font-medium">{t.label}</p>
                  <p className="text-xs text-muted-foreground">{t.hint}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">Platform vs owner income lives in <Link href="/admin/earnings" className="text-brand hover:underline">/admin/earnings</Link>; reports and CSV export in <Link href="/admin/reports" className="text-brand hover:underline">/admin/reports</Link>; announcements in <Link href="/admin/announcements" className="text-brand hover:underline">/admin/announcements</Link>.</p>
    </div>
  );
}
