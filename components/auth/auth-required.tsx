"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { firebaseAuth } from "@/lib/firebase/client";

export function AuthRequired({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(firebaseAuth, (nextUser) => {
      setUser(nextUser);
      setResolved(true);
    });
  }, []);

  useEffect(() => {
    if (!resolved || user) return;
    const returnTo = `${window.location.pathname}${window.location.search}`;
    router.replace(`/auth/login?returnTo=${encodeURIComponent(returnTo)}`);
  }, [resolved, router, user]);

  if (!resolved || !user) {
    return (
      <div className="grid min-h-[55vh] place-items-center text-foreground">
        <div className="flex items-center gap-3 rounded-md border border-border bg-surface px-4 py-3 text-sm text-muted">
          <LoaderCircle className="size-5 animate-spin" />
          Checking your login...
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
