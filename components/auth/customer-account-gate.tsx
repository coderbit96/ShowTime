"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { firebaseAuth } from "@/lib/firebase/client";

type Role = "CUSTOMER" | "ORGANIZER" | "ADMIN";
type GateState = "checking" | "allowed" | "redirecting" | "error";

const dashboardByRole: Record<Exclude<Role, "CUSTOMER">, string> = {
  ADMIN: "/admin/dashboard",
  ORGANIZER: "/organizer/dashboard",
};

export function CustomerAccountGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<GateState>("checking");
  const [message, setMessage] = useState("Checking your account...");

  useEffect(() => {
    let active = true;

    const checkRole = async (user: User | null) => {
      if (!user) {
        if (sessionStorage.getItem("show-time-post-logout")) {
          sessionStorage.removeItem("show-time-post-logout");
          router.replace("/");
          return;
        }
        const returnTo = `${window.location.pathname}${window.location.search}`;
        router.replace(`/auth/login?returnTo=${encodeURIComponent(returnTo)}`);
        return;
      }

      try {
        const token = await user.getIdToken();
        const response = await fetch("/api/auth/session", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        const payload = (await response.json()) as {
          user?: { role: Role };
          error?: string;
        };
        if (!response.ok || !payload.user)
          throw new Error(payload.error ?? "Unable to verify your account.");
        if (!active) return;

        if (payload.user.role === "CUSTOMER") {
          setState("allowed");
          return;
        }

        setState("redirecting");
        setMessage(
          `Taking you to your ${payload.user.role.toLowerCase()} dashboard...`,
        );
        router.replace(dashboardByRole[payload.user.role]);
      } catch (error) {
        if (!active) return;
        setState("error");
        setMessage(
          error instanceof Error
            ? error.message
            : "Unable to verify your account.",
        );
      }
    };

    const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
      void checkRole(user);
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [router]);

  if (state === "allowed") return <>{children}</>;

  return (
    <div className="grid min-h-[55vh] place-items-center text-foreground">
      <div
        className={`flex max-w-md items-center gap-3 rounded-md border px-4 py-3 text-sm ${state === "error" ? "border-accent/50 bg-accent/10" : "border-border bg-surface text-muted"}`}
        role={state === "error" ? "alert" : "status"}
      >
        {state !== "error" ? (
          <LoaderCircle className="size-5 shrink-0 animate-spin" />
        ) : null}
        {message}
      </div>
    </div>
  );
}
