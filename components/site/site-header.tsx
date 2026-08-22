"use client";

import Link from "next/link";
import { useState } from "react";
import {
  CalendarDays,
  ChevronDown,
  Menu,
  Search,
  Ticket,
  UserRound,
  X,
} from "lucide-react";
import { CitySelector } from "./city-selector";

const navLinks = [
  { label: "Movies", href: "#" },
  { label: "Events", href: "#" },
  { label: "Sports", href: "#" },
  { label: "Experiences", href: "#" },
];

export function SiteHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/92 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <span className="grid size-9 place-items-center rounded-md bg-primary text-sm font-black text-primary-foreground">
            ST
          </span>
          <span className="hidden text-lg font-semibold text-foreground sm:block">
            Show Time
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-muted hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto hidden min-w-0 max-w-xl flex-1 items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 md:flex lg:ml-4">
          <Search className="size-4 shrink-0 text-muted" aria-hidden="true" />
          <button
            type="button"
            className="min-w-0 flex-1 truncate text-left text-sm text-muted"
          >
            Search movies, events, venues
          </button>
          <CalendarDays className="size-4 shrink-0 text-primary" />
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <CitySelector />
          <div className="relative">
            <button
              type="button"
              onClick={() => setAccountOpen((current) => !current)}
              className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-foreground"
              aria-expanded={accountOpen}
            >
              <UserRound className="size-4" aria-hidden="true" />
              <span>Account</span>
              <ChevronDown className="size-4" aria-hidden="true" />
            </button>

            {accountOpen ? (
              <div className="absolute right-0 top-12 z-40 w-56 rounded-md border border-border bg-surface p-2 shadow-xl shadow-primary/10">
                <Link
                  href="/auth/login"
                  onClick={() => setAccountOpen(false)}
                  className="block rounded-md px-3 py-2.5 text-sm font-medium transition-colors hover:bg-surface-muted"
                >
                  Login
                </Link>
                <Link
                  href="/auth/register"
                  onClick={() => setAccountOpen(false)}
                  className="block rounded-md px-3 py-2.5 text-sm font-medium transition-colors hover:bg-surface-muted"
                >
                  Create account
                </Link>
              </div>
            ) : null}
          </div>
        </div>

        <button
          type="button"
          className="ml-auto grid size-10 place-items-center rounded-md border border-border bg-surface md:hidden"
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
        <div className="border-t border-border bg-background px-4 py-4 md:hidden">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2">
              <Search className="size-4 text-muted" aria-hidden="true" />
              <button
                type="button"
                className="min-w-0 flex-1 truncate text-left text-sm text-muted"
              >
                Search movies, events, venues
              </button>
            </div>

            <CitySelector />

            <div className="grid gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="rounded-md px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-muted hover:text-foreground"
                >
                  {link.label}
                </Link>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/auth/login"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground"
              >
                <Ticket className="size-4" aria-hidden="true" />
                Login
              </Link>
              <Link
                href="/auth/register"
                className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-surface px-3 text-sm font-medium text-foreground"
              >
                Register
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
