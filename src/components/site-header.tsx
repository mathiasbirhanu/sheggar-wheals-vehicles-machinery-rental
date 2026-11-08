import Link from "next/link";
import { CarFront, Menu, ShieldCheck } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { signOutAction } from "@/actions/auth";
import { site } from "@/lib/site";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationBell } from "@/components/notification-bell";
import { ThemeToggle } from "@/components/theme-toggle";

export async function SiteHeader() {
  const user = await getCurrentUser();
  const links = [
    { href: "/cars", label: "Browse cars" },
    ...(user ? [{ href: "/dashboard", label: "My Bookings" }] : []),
    ...(user?.roles.includes("OWNER") ? [{ href: "/owner", label: "Owner hub" }] : []),
    ...(user?.roles.includes("ADMIN") ? [{ href: "/admin", label: "Admin" }] : []),
  ];

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
        <Link href="/" className="flex items-center gap-2 font-bold">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-brand-foreground"><CarFront className="h-5 w-5" /></span>
          <span className="hidden sm:inline">{site.name}</span>
        </Link>
        <Badge variant="outline" className="hidden gap-1 border-amber-500/50 bg-amber-50 text-[10px] text-amber-800 md:inline-flex dark:bg-amber-950 dark:text-amber-300">
          <ShieldCheck className="h-3 w-3" /> Demo data
        </Badge>

        <nav aria-label="Main" className="ml-4 hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Button key={l.href} asChild variant="ghost" size="sm">
              <Link href={l.href}>{l.label}</Link>
            </Button>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1">
          {user && <NotificationBell />}
          <ThemeToggle />
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 px-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand/15 text-xs font-bold text-brand">
                    {user.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                  </span>
                  <span className="hidden max-w-24 truncate text-sm sm:inline">{user.name.split(" ")[0]}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <p className="text-sm font-medium">{user.name}</p>
                  <p className="text-xs font-normal text-muted-foreground">{user.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {links.map((l) => (
                  <DropdownMenuItem key={l.href} asChild className="md:hidden"><Link href={l.href}>{l.label}</Link></DropdownMenuItem>
                ))}
                <DropdownMenuSeparator className="md:hidden" />
                <DropdownMenuItem asChild><Link href="/bookings">Booking history</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link href="/notifications">Notifications</Link></DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <form action={signOutAction} className="w-full">
                    <button type="submit" className="w-full text-left text-red-600">Sign out</button>
                  </form>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-1">
              <Button asChild variant="ghost" size="sm"><Link href="/signin">Sign in</Link></Button>
              <Button asChild size="sm" className="bg-brand text-brand-foreground hover:bg-brand/90"><Link href="/signup">Sign up</Link></Button>
            </div>
          )}
          {/* Mobile nav */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu"><Menu className="h-5 w-5" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 md:hidden">
              {links.map((l) => (
                <DropdownMenuItem key={l.href} asChild><Link href={l.href}>{l.label}</Link></DropdownMenuItem>
              ))}
              <DropdownMenuItem asChild><Link href="/bookings">Booking history</Link></DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
