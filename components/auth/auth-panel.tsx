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
import { Eye, EyeOff, LoaderCircle, Mail, UserPlus } from "lucide-react";
import { firebaseAuth } from "@/lib/firebase/client";

type AuthMode = "login" | "register";
type AuthIntent = "CUSTOMER" | "ORGANIZER" | "ADMIN";
const organizerPendingMessage =
  "Your organizer account is not approved yet. Please wait some time.";

export function AuthPanel({
  mode,
  intent = "CUSTOMER",
}: {
  mode: AuthMode;
  intent?: AuthIntent;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isAdminLogin = intent === "ADMIN";
  const [currentMode, setCurrentMode] = useState<AuthMode>(
    isAdminLogin ? "login" : mode,
  );
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(
    searchParams.get("notice") === "approval-pending"
      ? organizerPendingMessage
      : "",
  );
  const [showPassword, setShowPassword] = useState(false);

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
      body: JSON.stringify({
        role: profileRole,
        expectedRole: intent === "CUSTOMER" ? profileRole : intent,
        ...body,
      }),
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

  const showAuthError = async (error: unknown) => {
    const nextMessage =
      error instanceof Error ? error.message : "Authentication failed.";
    if (
      intent === "ORGANIZER" &&
      nextMessage.toLowerCase().includes("not approved")
    ) {
      await firebaseAuth.signOut();
    }
    setMessage(nextMessage);
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
    const profileRole = intent === "ORGANIZER" ? "ORGANIZER" : "CUSTOMER";
    try {
      if (currentMode === "register") {
        if (isAdminLogin) {
          throw new Error("Admin accounts can only be created by the system.");
        }
        const credential = await createUserWithEmailAndPassword(
          firebaseAuth,
          email,
          password,
        );
        if (name) await updateProfile(credential.user, { displayName: name });
        const user = await syncProfile(profileRole, {
          name,
          phone,
          organizationName,
        });
        assertAllowedRole(user?.role);
        router.push(destinationForRole(user?.role));
        return;
      }
      await signInWithEmailAndPassword(firebaseAuth, email, password);
      const user = await syncProfile(profileRole);
      assertAllowedRole(user?.role);
      router.push(destinationForRole(user?.role));
    } catch (error) {
      await showAuthError(error);
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
        intent === "ORGANIZER" ? "ORGANIZER" : "CUSTOMER",
      );
      assertAllowedRole(user?.role);
      router.push(destinationForRole(user?.role));
    } catch (error) {
      await showAuthError(
        error instanceof Error ? error : new Error("Google login failed."),
      );
    } finally {
      setLoading(false);
    }
  };

  const title =
    intent === "ADMIN"
      ? "Admin login"
      : intent === "ORGANIZER"
        ? currentMode === "register"
          ? "Organizer registration"
          : "Organizer login"
        : currentMode === "register"
          ? "Create your account"
          : "Welcome back";

  return (
    <main className="min-h-screen bg-background px-5 py-10 text-foreground sm:px-6">
      {message ? (
        <div
          role="status"
          className="fixed right-5 top-5 z-50 max-w-sm rounded-md border border-secondary/40 bg-surface px-4 py-3 text-sm font-semibold text-foreground shadow-2xl shadow-secondary/10"
        >
          {message}
        </div>
      ) : null}
      <section
        className={`mx-auto rounded-md border border-border bg-surface shadow-xl shadow-black/10 ${
          isAdminLogin ? "min-h-[32rem] max-w-sm p-6 sm:p-7" : "max-w-md p-5"
        }`}
      >
        <p className="text-sm font-semibold text-secondary">Show Time</p>
        <h1 className="mt-2 text-3xl font-semibold">{title}</h1>
        {intent !== "CUSTOMER" ? (
          <p className="mt-2 text-sm leading-6 text-muted">
            {intent === "ORGANIZER" && currentMode === "register"
              ? "Create your organizer profile. Admin approval is required before dashboard access."
              : `Use your approved ${intent.toLowerCase()} account to continue.`}
          </p>
        ) : null}
        <form onSubmit={submit} className="mt-6 grid gap-3">
          {currentMode === "register" ? (
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
              {intent === "ORGANIZER" ? (
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
          <div className="relative">
            <input
              name="password"
              required
              type={showPassword ? "text" : "password"}
              minLength={6}
              placeholder="Password"
              className="h-11 w-full rounded-md border border-border bg-background px-3 pr-12 text-sm"
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-md text-muted hover:bg-surface-muted hover:text-foreground"
              aria-label={showPassword ? "Hide password" : "Show password"}
              title={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="size-4" aria-hidden="true" />
              ) : (
                <Eye className="size-4" aria-hidden="true" />
              )}
            </button>
          </div>
          <button
            disabled={loading}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-cta px-4 text-sm font-semibold text-cta-foreground disabled:opacity-50"
          >
            {loading ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : currentMode === "register" ? (
              <UserPlus className="size-4" />
            ) : (
              <Mail className="size-4" />
            )}
            {currentMode === "register" ? "Create account" : "Login"}
          </button>
        </form>
        {intent !== "ADMIN" ? (
          <button
            type="button"
            onClick={() => void googleLogin()}
            disabled={loading}
            className="mt-3 h-11 w-full rounded-md border border-border text-sm font-semibold"
          >
            Continue with Google
          </button>
        ) : null}
        {!isAdminLogin ? (
          <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted">
            {intent === "ORGANIZER" ? (
              <>
                {currentMode !== "login" ? (
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentMode("login");
                      setMessage("");
                    }}
                    className="hover:text-foreground"
                  >
                    Login
                  </button>
                ) : null}
                {currentMode !== "register" ? (
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentMode("register");
                      setMessage("");
                    }}
                    className="hover:text-foreground"
                  >
                    Register
                  </button>
                ) : null}
              </>
            ) : (
              <>
                {currentMode !== "login" ? (
                  <a href="/auth/login">Login</a>
                ) : null}
                {currentMode !== "register" ? (
                  <a href="/auth/register">Register</a>
                ) : null}
              </>
            )}
          </div>
        ) : null}
      </section>
    </main>
  );
}
