import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthPanel } from "@/components/auth/auth-panel";

export const metadata: Metadata = {
  title: "Admin Login | Show Time",
  description: "Login to the Show Time admin dashboard.",
};

export default function AdminIndexPage() {
  return (
    <Suspense fallback={<AuthPanelFallback />}>
      <AuthPanel mode="login" intent="ADMIN" />
    </Suspense>
  );
}

function AuthPanelFallback() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md items-center justify-center px-4 py-16">
      <div className="h-96 w-full animate-pulse rounded-[2rem] border border-white/10 bg-white/[0.04]" />
    </main>
  );
}
