// Branded 404 (NFR UX): help the user recover — search, catalogue, dashboard.
import Link from "next/link";
import { Compass, Search, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";

export default async function NotFound() {
  const user = await getCurrentUser();
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
        <Compass className="h-7 w-7 text-muted-foreground" aria-hidden />
      </div>
      <p className="font-mono text-sm text-muted-foreground">404</p>
      <h1 className="text-xl font-bold">This road doesn&apos;t exist</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        The page you were looking for has moved, or the link is out of date. From here you can jump
        straight back into the Addis Ababa catalogue.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Button asChild size="sm">
          <Link href="/cars">
            <Search className="mr-2 h-4 w-4" aria-hidden /> Browse cars
          </Link>
        </Button>
        {user && (
          <Button asChild size="sm" variant="outline">
            <Link href="/dashboard">
              <LayoutDashboard className="mr-2 h-4 w-4" aria-hidden /> My dashboard
            </Link>
          </Button>
        )}
        <Button asChild size="sm" variant="ghost">
          <Link href="/">Home</Link>
        </Button>
      </div>
    </div>
  );
}
