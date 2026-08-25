import type { ReactNode } from "react";
import { ManagementShell } from "@/components/dashboard/management-shell";

export default function OrganizerLayout({ children }: { children: ReactNode }) {
  return <ManagementShell role="ORGANIZER">{children}</ManagementShell>;
}
