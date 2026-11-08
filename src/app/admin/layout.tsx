// Admin segment guard (FR-05, BR-08): only the ADMIN role reaches /admin pages.
import { requireRole } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireRole("ADMIN");
  return <>{children}</>;
}
