"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  LogOut,
  Settings,
  UserRound,
  WalletCards,
} from "lucide-react";
import { firebaseAuth } from "@/lib/firebase/client";

const accountLinks = [
  { href: "/account?tab=profile", label: "Profile", icon: UserRound },
  { href: "/account?tab=wallet", label: "My wallet", icon: WalletCards },
  { href: "/account?tab=settings", label: "Settings", icon: Settings },
];

export function CustomerAccountMenu({
  onNavigate,
  compact = false,
}: {
  onNavigate?: () => void;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const signOut = async () => {
    setSigningOut(true);
    sessionStorage.setItem("show-time-post-logout", "true");
    try {
      await firebaseAuth.signOut();
      onNavigate?.();
      router.replace("/");
    } catch {
      sessionStorage.removeItem("show-time-post-logout");
      setSigningOut(false);
    }
  };

  if (compact) {
    return (
      <div className="grid gap-1 rounded-xl border border-border bg-surface p-2">
        {accountLinks.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              href={item.href}
              key={item.href}
              onClick={onNavigate}
              className="flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium text-muted transition-colors hover:bg-surface-muted hover:text-foreground"
            >
              <Icon className="size-4 text-secondary" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => void signOut()}
          disabled={signingOut}
          className="flex h-10 items-center gap-3 rounded-lg px-3 text-left text-sm font-semibold text-accent transition-colors hover:bg-accent/10 disabled:cursor-wait disabled:opacity-60"
        >
          <LogOut className="size-4" aria-hidden="true" />
          {signingOut ? "Signing out..." : "Log out"}
        </button>
      </div>
    );
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="premium-button h-9 gap-1.5 px-2.5 text-xs font-semibold"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="customer-account-menu"
      >
        <UserRound className="size-3.5" aria-hidden="true" />
        <span>My account</span>
        <ChevronDown
          className={`size-3.5 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>
      {open ? (
        <div
          id="customer-account-menu"
          role="menu"
          aria-label="My account"
          className="premium-panel absolute right-0 top-12 z-50 w-52 rounded-xl border border-border p-2 shadow-[0_18px_45px_rgba(15,23,42,0.16)]"
        >
          {accountLinks.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                href={item.href}
                key={item.href}
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium text-muted transition-colors hover:bg-surface-muted hover:text-foreground"
              >
                <Icon className="size-4 text-secondary" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
          <div className="my-2 h-px bg-border" />
          <button
            type="button"
            role="menuitem"
            onClick={() => void signOut()}
            disabled={signingOut}
            className="flex h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-semibold text-accent transition-colors hover:bg-accent/10 disabled:cursor-wait disabled:opacity-60"
          >
            <LogOut className="size-4" aria-hidden="true" />
            {signingOut ? "Signing out..." : "Log out"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
