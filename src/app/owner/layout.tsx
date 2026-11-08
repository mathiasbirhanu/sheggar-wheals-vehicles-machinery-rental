// Owner segment guard: every /owner page requires the OWNER role (FR-33, BR-08, BR-11).
import { requireRole } from "@/lib/auth";

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  await requireRole("OWNER");
  return <>{children}</>;
}
