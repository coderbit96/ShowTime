import { Suspense } from "react";
import { AuthPanel } from "@/components/auth/auth-panel";
import { pageMetadata } from "@/lib/seo/site";

export const metadata = pageMetadata({
  title: "Register | Show Time",
  description: "Create a customer or organizer account.",
  path: "/auth/register",
  index: false,
});

export default function RegisterPage() {
  return (
    <Suspense fallback={<AuthPanelFallback />}>
      <AuthPanel mode="register" />
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
