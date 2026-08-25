import type { ReactNode } from "react";
import { ManagementShell } from "@/components/dashboard/management-shell";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <ManagementShell role="ADMIN">{children}</ManagementShell>;
}
