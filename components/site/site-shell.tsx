import type { ReactNode } from "react";
import { PageTransition } from "@/components/motion";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

type SiteShellProps = {
  children: ReactNode;
};

export function SiteShell({ children }: SiteShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <SiteHeader />
      <div className="flex-1">
        <PageTransition>{children}</PageTransition>
      </div>
      <SiteFooter />
    </div>
  );
}
