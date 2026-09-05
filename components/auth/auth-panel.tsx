"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from "firebase/auth";
import {
  CheckCircle2,
  Eye,
  EyeOff,
  LoaderCircle,
  Mail,
  ShieldCheck,
  Sparkles,
  UserPlus,
} from "lucide-react";
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
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
    const confirmPassword = String(form.get("confirmPassword") ?? "");
    const name = String(form.get("name") ?? "");
    const phone = String(form.get("phone") ?? "");
    const organizationName = String(form.get("organizationName") ?? "");
    const profileRole = intent === "ORGANIZER" ? "ORGANIZER" : "CUSTOMER";
    try {
      if (currentMode === "register") {
        if (isAdminLogin) {
          throw new Error("Admin accounts can only be created by the system.");
        }
        if (password !== confirmPassword) {
          throw new Error("Your passwords do not match.");
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
  const isRegister = currentMode === "register";
  const subtitle =
    intent === "CUSTOMER"
      ? isRegister
        ? "Create an account to save plans and manage your bookings."
        : "Sign in to manage bookings, rewards, and saved plans."
      : intent === "ORGANIZER" && isRegister
        ? "Create your organizer profile. Admin approval is required before dashboard access."
        : `Use your approved ${intent.toLowerCase()} account to continue.`;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_12%_12%,rgba(109,40,217,0.12),transparent_28%),radial-gradient(circle_at_88%_82%,rgba(8,134,166,0.12),transparent_30%),var(--background)] px-5 py-8 text-foreground sm:px-6 sm:py-12">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-secondary/60 to-transparent" />
      {message ? (
        <div
          role="status"
          className="fixed right-5 top-5 z-50 max-w-sm rounded-xl border border-secondary/40 bg-surface px-4 py-3 text-sm font-semibold text-foreground shadow-2xl shadow-secondary/15"
        >
          {message}
        </div>
      ) : null}
      <section
        className={`relative mx-auto grid overflow-hidden rounded-3xl border border-border bg-surface shadow-[0_28px_80px_rgba(15,23,42,0.14)] ${
          isAdminLogin ? "max-w-md" : "max-w-5xl lg:grid-cols-[0.94fr_1.06fr]"
        }`}
      >
        {!isAdminLogin ? (
          <aside className="relative hidden overflow-hidden bg-[linear-gradient(145deg,rgba(109,40,217,0.96),rgba(124,58,237,0.9)_48%,rgba(8,134,166,0.9))] p-9 text-white lg:flex lg:flex-col">
            <div className="absolute -right-20 -top-20 size-64 rounded-full border border-white/20" />
            <div className="absolute -bottom-28 -left-20 size-72 rounded-full border border-white/15" />
            <Link href="/" className="relative inline-flex items-center gap-3 self-start">
              <Image
                src="/show-time-logo.svg"
                alt="Show Time"
                width={44}
                height={44}
                className="size-11 rounded-xl bg-slate-950/15 p-1.5"
              />
              <span className="text-lg font-semibold">Show Time</span>
            </Link>
            <div className="relative mt-14">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-semibold">
                <Sparkles className="size-3.5" aria-hidden="true" />
                Plans made simple
              </span>
              <h2 className="mt-6 max-w-sm text-4xl font-semibold leading-tight tracking-tight">
                Your next great night starts here.
              </h2>
              <p className="mt-4 max-w-sm text-sm leading-6 text-white/80">
                Discover the best of your city and keep every ticket, reward,
                and plan in one place.
              </p>
              <ul className="mt-8 grid gap-3 text-sm text-white/90">
                {[
                  "Secure, verified ticketing",
                  "Rewards with every booking",
                  "Simple booking and cancellations",
                ].map((benefit) => (
                  <li key={benefit} className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>
            <p className="relative mt-auto pt-8 text-xs text-white/70">
              Made for better nights out.
            </p>
          </aside>
        ) : null}

        <div className={`p-6 sm:p-8 ${isAdminLogin ? "sm:p-9" : "lg:p-10"}`}>
          <Link href="/" className="inline-flex items-center gap-2 lg:hidden">
            <Image
              src="/show-time-logo.svg"
              alt="Show Time"
              width={36}
              height={36}
              className="size-9"
            />
            <span className="text-sm font-semibold text-secondary">Show Time</span>
          </Link>
          {isAdminLogin ? (
            <div className="inline-flex size-11 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
              <ShieldCheck className="size-5" aria-hidden="true" />
            </div>
          ) : null}
          <p className="mt-5 text-xs font-bold uppercase tracking-[0.14em] text-secondary">
            {isRegister ? "Create your account" : "Welcome to Show Time"}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            {title}
          </h1>
          <p className="mt-3 max-w-md text-sm leading-6 text-muted">{subtitle}</p>

        <form onSubmit={submit} className="mt-7 grid gap-4">
          {currentMode === "register" ? (
            <>
              <label className="grid gap-1.5 text-sm font-medium">
                Full name
                <input
                  name="name"
                  required
                  autoComplete="name"
                  placeholder="Your full name"
                  className="h-11 rounded-xl border border-border bg-background px-3.5 text-sm outline-none transition placeholder:text-muted focus:border-secondary focus:ring-4 focus:ring-secondary/10"
                />
              </label>
              <label className="grid gap-1.5 text-sm font-medium">
                Phone number <span className="font-normal text-muted">(optional)</span>
                <input
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="Your mobile number"
                  className="h-11 rounded-xl border border-border bg-background px-3.5 text-sm outline-none transition placeholder:text-muted focus:border-secondary focus:ring-4 focus:ring-secondary/10"
                />
              </label>
              {intent === "ORGANIZER" ? (
                <label className="grid gap-1.5 text-sm font-medium">
                  Organization name
                  <input
                    name="organizationName"
                    required
                    autoComplete="organization"
                    placeholder="Your organization"
                    className="h-11 rounded-xl border border-border bg-background px-3.5 text-sm outline-none transition placeholder:text-muted focus:border-secondary focus:ring-4 focus:ring-secondary/10"
                  />
                </label>
              ) : null}
            </>
          ) : null}
          <label className="grid gap-1.5 text-sm font-medium">
            Email address
            <input
              name="email"
              required
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              className="h-11 rounded-xl border border-border bg-background px-3.5 text-sm outline-none transition placeholder:text-muted focus:border-secondary focus:ring-4 focus:ring-secondary/10"
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Password
            <span className="relative">
              <input
                name="password"
                required
                type={showPassword ? "text" : "password"}
                minLength={6}
                autoComplete={isRegister ? "new-password" : "current-password"}
                placeholder={isRegister ? "At least 6 characters" : "Enter your password"}
                className="h-11 w-full rounded-xl border border-border bg-background px-3.5 pr-12 text-sm outline-none transition placeholder:text-muted focus:border-secondary focus:ring-4 focus:ring-secondary/10"
              />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              className="absolute right-1.5 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-muted hover:bg-surface-muted hover:text-foreground"
              aria-label={showPassword ? "Hide password" : "Show password"}
              title={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="size-4" aria-hidden="true" />
              ) : (
                <Eye className="size-4" aria-hidden="true" />
              )}
            </button>
            </span>
          </label>
          {isRegister ? (
            <label className="grid gap-1.5 text-sm font-medium">
              Confirm password
              <span className="relative">
                <input
                  name="confirmPassword"
                  required
                  type={showConfirmPassword ? "text" : "password"}
                  minLength={6}
                  autoComplete="new-password"
                  placeholder="Enter your password again"
                  className="h-11 w-full rounded-xl border border-border bg-background px-3.5 pr-12 text-sm outline-none transition placeholder:text-muted focus:border-secondary focus:ring-4 focus:ring-secondary/10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((current) => !current)}
                  className="absolute right-1.5 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-muted hover:bg-surface-muted hover:text-foreground"
                  aria-label={
                    showConfirmPassword
                      ? "Hide confirmed password"
                      : "Show confirmed password"
                  }
                  title={
                    showConfirmPassword
                      ? "Hide confirmed password"
                      : "Show confirmed password"
                  }
                >
                  {showConfirmPassword ? (
                    <EyeOff className="size-4" aria-hidden="true" />
                  ) : (
                    <Eye className="size-4" aria-hidden="true" />
                  )}
                </button>
              </span>
            </label>
          ) : null}
          <button
            disabled={loading}
            className="premium-button mt-1 inline-flex h-12 items-center justify-center gap-2 px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
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
          <>
            <div className="my-5 flex items-center gap-3 text-xs text-muted">
              <span className="h-px flex-1 bg-border" />
              or continue with
              <span className="h-px flex-1 bg-border" />
            </div>
            <button
              type="button"
              onClick={() => void googleLogin()}
              disabled={loading}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 text-sm font-semibold transition hover:border-secondary/45 hover:bg-secondary/5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
                <path fill="#4285F4" d="M21.8 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.5a4.7 4.7 0 0 1-2 3.1v2.5h3.2c1.9-1.8 3.1-4.4 3.1-7.4Z" />
                <path fill="#34A853" d="M12 22c2.7 0 5-.9 6.7-2.4l-3.2-2.5c-.9.6-2 .9-3.5.9-2.7 0-5-1.8-5.8-4.3H2.9v2.6A10 10 0 0 0 12 22Z" />
                <path fill="#FBBC05" d="M6.2 13.7a6 6 0 0 1 0-3.4V7.7H2.9a10 10 0 0 0 0 8.6l3.3-2.6Z" />
                <path fill="#EA4335" d="M12 6c1.5 0 2.9.5 3.9 1.5l2.9-2.9A10 10 0 0 0 2.9 7.7l3.3 2.6C7 7.8 9.3 6 12 6Z" />
              </svg>
              Continue with Google
            </button>
          </>
        ) : null}
        {!isAdminLogin ? (
          <div className="mt-6 text-center text-sm text-muted">
            {intent === "ORGANIZER" ? (
              <>
                {currentMode !== "login" ? (
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentMode("login");
                      setMessage("");
                    }}
                    className="font-semibold text-secondary hover:text-secondary/80"
                  >
                    Already have an account? Log in
                  </button>
                ) : null}
                {currentMode !== "register" ? (
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentMode("register");
                      setMessage("");
                    }}
                    className="font-semibold text-secondary hover:text-secondary/80"
                  >
                    New to Show Time? Create an account
                  </button>
                ) : null}
              </>
            ) : (
              <>
                {currentMode !== "login" ? (
                  <Link href="/auth/login" className="font-semibold text-secondary hover:text-secondary/80">
                    Already have an account? Log in
                  </Link>
                ) : null}
                {currentMode !== "register" ? (
                  <Link href="/auth/register" className="font-semibold text-secondary hover:text-secondary/80">
                    New to Show Time? Create an account
                  </Link>
                ) : null}
              </>
            )}
          </div>
        ) : null}
        </div>
      </section>
    </main>
  );
}
