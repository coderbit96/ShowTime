"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { Menu, Search, Ticket, UserRound, X } from "lucide-react";
import { GlobalSearch } from "@/components/search";
import { firebaseAuth } from "@/lib/firebase/client";
import { CitySelector } from "./city-selector";
import { CustomerAccountMenu } from "./customer-account-menu";
import { NotificationMenu } from "./notification-menu";

type AccountRole = "CUSTOMER" | "ORGANIZER" | "ADMIN";

const accountDestination: Record<AccountRole, string> = {
  CUSTOMER: "/account",
  ORGANIZER: "/organizer/dashboard",
  ADMIN: "/admin/dashboard",
};

const accountLabel: Record<AccountRole, string> = {
  CUSTOMER: "My account",
  ORGANIZER: "Organizer dashboard",
  ADMIN: "Admin dashboard",
};

const navLinks = [
  { label: "Movies", href: "/#recommended-movies" },
  { label: "Events", href: "/#live-events" },
  { label: "Sports", href: "/#sports" },
  { label: "Plays", href: "/#live-events" },
  { label: "Activities", href: "/#weekend-experiences" },
  { label: "Offers", href: "/#under-499" },
];

export function SiteHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [accountRole, setAccountRole] = useState<AccountRole | null>(null);

  useEffect(() => {
    let active = true;
    const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
      setAuthUser(user);
      setAccountRole(null);
      if (!user) return;
      void user
        .getIdToken()
        .then((token) =>
          fetch("/api/auth/session", {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
          }),
        )
        .then(async (response) => {
          if (!response.ok) return null;
          return (await response.json()) as {
            user?: { role?: AccountRole };
          };
        })
        .then((payload) => {
          if (active && payload?.user?.role) setAccountRole(payload.user.role);
        })
        .catch(() => undefined);
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const accountHref = accountRole
    ? accountDestination[accountRole]
    : "/account";
  const resolvedAccountLabel = accountRole
    ? accountLabel[accountRole]
    : authUser
      ? "My account"
      : "Account";

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-background/78 shadow-[0_10px_38px_rgba(0,0,0,0.28)] backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
        <Link href="/" className="group flex shrink-0 items-center gap-2">
          <Image
            src="/show-time-logo.svg"
            alt="Show Time"
            width={36}
            height={36}
            priority
            className="size-9 drop-shadow-[0_0_18px_rgba(6,182,212,0.28)] transition-transform group-hover:scale-105"
          />
          <span className="hidden text-lg font-semibold text-foreground group-hover:text-secondary sm:block">
            Show Time
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted hover:bg-white/[0.06] hover:text-foreground hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="premium-panel ml-auto hidden min-w-0 max-w-xl flex-1 rounded-md px-3 py-1 md:block lg:ml-4">
          <GlobalSearch />
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <CitySelector />
          <NotificationMenu />
          {authUser && accountRole === "CUSTOMER" ? (
            <CustomerAccountMenu />
          ) : (
            <Link
              href={accountHref}
              className="premium-button h-10 gap-2 px-3 text-sm font-semibold"
            >
              <UserRound className="size-4" aria-hidden="true" />
              <span>{resolvedAccountLabel}</span>
            </Link>
          )}
        </div>

        <button
          type="button"
          className="premium-button-secondary ml-auto grid size-10 place-items-center md:hidden"
          onClick={() => setMobileOpen((current) => !current)}
          aria-expanded={mobileOpen}
          aria-label="Menu"
        >
          {mobileOpen ? (
            <X className="size-5" aria-hidden="true" />
          ) : (
            <Menu className="size-5" aria-hidden="true" />
          )}
        </button>
      </div>

      {mobileOpen ? (
        <div className="border-t border-white/10 bg-background/95 px-4 py-4 shadow-2xl shadow-black/40 backdrop-blur-xl md:hidden">
          <div className="flex flex-col gap-3">
            <Link
              href="/search"
              className="premium-panel flex items-center gap-2 rounded-md px-3 py-2"
              onClick={() => setMobileOpen(false)}
            >
              <Search className="size-4 text-muted" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate text-sm text-muted">
                Search movies, artists, events, venues...
              </span>
            </Link>

            <CitySelector />

            <div className="grid gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="rounded-md px-3 py-2 text-sm font-medium text-muted hover:bg-white/[0.07] hover:text-foreground"
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {authUser && accountRole === "CUSTOMER" ? (
              <CustomerAccountMenu
                compact
                onNavigate={() => setMobileOpen(false)}
              />
            ) : authUser ? (
              <Link
                href={accountHref}
                className="premium-button h-10 gap-2 px-3 text-sm font-semibold"
                onClick={() => setMobileOpen(false)}
              >
                <UserRound className="size-4" aria-hidden="true" />
                {resolvedAccountLabel}
              </Link>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/auth/login?returnTo=%2Faccount"
                  className="premium-button h-10 gap-2 px-3 text-sm font-semibold"
                  onClick={() => setMobileOpen(false)}
                >
                  <Ticket className="size-4" aria-hidden="true" />
                  Login
                </Link>
                <Link
                  href="/auth/register?returnTo=%2Faccount"
                  className="premium-button-secondary h-10 px-3 text-sm font-semibold"
                  onClick={() => setMobileOpen(false)}
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </header>
  );
}
