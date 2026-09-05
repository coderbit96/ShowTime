import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthPanel } from "@/components/auth/auth-panel";

export const metadata: Metadata = {
  title: "Organizer Login & Register | Show Time",
  description: "Login or register for the Show Time organizer dashboard.",
};

export default function OrganizerIndexPage() {
  return (
    <Suspense fallback={<AuthPanelFallback />}>
      <AuthPanel mode="login" intent="ORGANIZER" />
    </Suspense>
  );
}

function AuthPanelFallback() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md items-center justify-center px-4 py-16">
      <div className="h-96 w-full animate-pulse rounded-[2rem] border border-border bg-surface-muted" />
    </main>
  );
}
