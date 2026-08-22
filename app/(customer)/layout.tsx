import type { ReactNode } from "react";
import { SiteShell } from "@/components/site";

export default function CustomerSiteLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <SiteShell>{children}</SiteShell>;
}
