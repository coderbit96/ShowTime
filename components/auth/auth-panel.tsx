"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from "firebase/auth";
import { LoaderCircle, Mail, UserPlus } from "lucide-react";
import { firebaseAuth } from "@/lib/firebase/client";

type AuthMode = "login" | "register";
type AuthIntent = "CUSTOMER" | "ORGANIZER" | "ADMIN";

export function AuthPanel({
  mode,
  intent = "CUSTOMER",
}: {
  mode: AuthMode;
  intent?: AuthIntent;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [role, setRole] = useState<"CUSTOMER" | "ORGANIZER">(
    intent === "ORGANIZER" ? "ORGANIZER" : "CUSTOMER",
  );
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const redirectTo =
    searchParams.get("returnTo") ||
    (intent === "ADMIN"
      ? "/admin/dashboard"
      : intent === "ORGANIZER"
        ? "/organizer/dashboard"
        : "/account");

  const syncProfile = async (
    profileRole: "CUSTOMER" | "ORGANIZER",
    body = {},
  ) => {
    const token = await firebaseAuth.currentUser?.getIdToken();
    if (!token) throw new Error("Firebase session was not created.");
    const response = await fetch("/api/auth/sync", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ role: profileRole, ...body }),
    });
    const payload = (await response.json()) as {
      user?: { role: string };
      error?: string;
    };
    if (!response.ok) throw new Error(payload.error ?? "Unable to sync user.");
    return payload.user;
  };

  const destinationForRole = (userRole?: string) => {
    if (userRole === "ORGANIZER") return "/organizer/dashboard";
    if (userRole === "ADMIN") return "/admin/dashboard";
    return redirectTo;
  };

  const assertAllowedRole = (userRole?: string) => {
    if (intent === "ADMIN" && userRole !== "ADMIN") {
      throw new Error("This login is only for Admin accounts.");
    }
    if (intent === "ORGANIZER" && userRole !== "ORGANIZER") {
      throw new Error("This login is only for Organizer accounts.");
    }
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    const name = String(form.get("name") ?? "");
    const phone = String(form.get("phone") ?? "");
    const organizationName = String(form.get("organizationName") ?? "");
    try {
      if (mode === "register") {
        const credential = await createUserWithEmailAndPassword(
          firebaseAuth,
          email,
          password,
        );
        if (name) await updateProfile(credential.user, { displayName: name });
        const user = await syncProfile(role, { name, phone, organizationName });
        assertAllowedRole(user?.role);
        router.push(destinationForRole(user?.role));
        return;
      }
      await signInWithEmailAndPassword(firebaseAuth, email, password);
      const user = await syncProfile(
        intent === "ORGANIZER" ? "ORGANIZER" : role,
      );
      assertAllowedRole(user?.role);
      router.push(destinationForRole(user?.role));
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Authentication failed.",
      );
    } finally {
      setLoading(false);
    }
  };

  const googleLogin = async () => {
    setLoading(true);
    setMessage("");
    try {
      await signInWithPopup(firebaseAuth, new GoogleAuthProvider());
      const user = await syncProfile(
        intent === "ORGANIZER" ? "ORGANIZER" : role,
      );
      assertAllowedRole(user?.role);
      router.push(destinationForRole(user?.role));
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Google login failed.",
      );
    } finally {
      setLoading(false);
    }
  };

  const title =
    intent === "ADMIN"
      ? "Admin login"
      : intent === "ORGANIZER"
        ? "Organizer login"
        : mode === "register"
          ? "Create your account"
          : "Welcome back";

  return (
    <main className="min-h-screen bg-background px-5 py-10 text-foreground sm:px-6">
      <section className="mx-auto max-w-md rounded-md border border-border bg-surface p-5 shadow-xl shadow-black/10">
        <p className="text-sm font-semibold text-secondary">Show Time</p>
        <h1 className="mt-2 text-3xl font-semibold">{title}</h1>
        {intent !== "CUSTOMER" ? (
          <p className="mt-2 text-sm leading-6 text-muted">
            Use your approved {intent.toLowerCase()} account to continue.
          </p>
        ) : null}
        <form onSubmit={submit} className="mt-6 grid gap-3">
          {intent === "CUSTOMER" ? (
            <div className="grid grid-cols-2 gap-2 rounded-md border border-border bg-background p-1">
              {(["CUSTOMER", "ORGANIZER"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRole(value)}
                  className={`h-9 rounded-sm text-xs font-semibold ${
                    role === value
                      ? "bg-primary text-primary-foreground"
                      : "text-muted"
                  }`}
                >
                  {value === "CUSTOMER" ? "Customer" : "Organizer"}
                </button>
              ))}
            </div>
          ) : null}
          {mode === "register" ? (
            <>
              <input
                name="name"
                required
                placeholder="Full name"
                className="h-11 rounded-md border border-border bg-background px-3 text-sm"
              />
              <input
                name="phone"
                placeholder="Phone"
                className="h-11 rounded-md border border-border bg-background px-3 text-sm"
              />
              {role === "ORGANIZER" ? (
                <input
                  name="organizationName"
                  required
                  placeholder="Organization name"
                  className="h-11 rounded-md border border-border bg-background px-3 text-sm"
                />
              ) : null}
            </>
          ) : null}
          <input
            name="email"
            required
            type="email"
            placeholder="Email"
            className="h-11 rounded-md border border-border bg-background px-3 text-sm"
          />
          <input
            name="password"
            required
            type="password"
            minLength={6}
            placeholder="Password"
            className="h-11 rounded-md border border-border bg-background px-3 text-sm"
          />
          <button
            disabled={loading}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-accent px-4 text-sm font-semibold text-accent-foreground disabled:opacity-50"
          >
            {loading ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : mode === "register" ? (
              <UserPlus className="size-4" />
            ) : (
              <Mail className="size-4" />
            )}
            {mode === "register" ? "Create account" : "Login"}
          </button>
        </form>
        <button
          type="button"
          onClick={() => void googleLogin()}
          disabled={loading}
          className="mt-3 h-11 w-full rounded-md border border-border text-sm font-semibold"
        >
          Continue with Google
        </button>
        {message ? (
          <p className="mt-4 rounded-md border border-secondary/40 bg-secondary/10 p-3 text-sm">
            {message}
          </p>
        ) : null}
        <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted">
          {mode !== "login" ? <a href="/auth/login">Login</a> : null}
          {mode !== "register" ? <a href="/auth/register">Register</a> : null}
        </div>
      </section>
    </main>
  );
}
