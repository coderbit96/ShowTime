"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CircleDollarSign,
  ClipboardList,
  FileText,
  LayoutDashboard,
  LogIn,
  LoaderCircle,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  Ticket,
  UserRound,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import { firebaseAuth } from "@/lib/firebase/client";

type Role = "ADMIN" | "ORGANIZER";

const organizerSections = [
  { label: "Dashboard", href: "/organizer/dashboard", icon: LayoutDashboard },
  { label: "All Events", href: "/organizer/events", icon: CalendarDays },
  { label: "Create Event", href: "/organizer/events/new", icon: FileText },
  { label: "Shows & Sessions", href: "/organizer/shows", icon: Ticket },
  {
    label: "Bookings & Attendees",
    href: "/organizer/bookings",
    icon: ClipboardList,
  },
  { label: "Check-In", href: "/organizer/check-in", icon: CheckCircle2 },
  {
    label: "Revenue & Commission",
    href: "/organizer/finance",
    icon: CircleDollarSign,
  },
  { label: "Payouts", href: "/organizer/payouts", icon: WalletCards },
  { label: "Coupons & Promotions", href: "/organizer/marketing", icon: Ticket },
  { label: "Analytics", href: "/organizer/analytics", icon: BarChart3 },
  { label: "Profile", href: "/organizer/profile", icon: UserRound },
  { label: "Settings", href: "/organizer/settings", icon: Settings },
];

const adminSections = [
  { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Users & Organizers", href: "/admin/users", icon: Users },
  { label: "Events & Approvals", href: "/admin/events", icon: CalendarDays },
  { label: "Movies, Cinemas & Shows", href: "/admin/shows", icon: Ticket },
  {
    label: "Bookings & Transactions",
    href: "/admin/bookings",
    icon: ClipboardList,
  },
  { label: "Refunds", href: "/admin/refunds", icon: WalletCards },
  { label: "Coupons & Banners", href: "/admin/marketing", icon: Ticket },
  {
    label: "Categories, Cities & Venues",
    href: "/admin/management",
    icon: Settings,
  },
  { label: "Reviews", href: "/admin/reviews", icon: FileText },
  { label: "Reports", href: "/admin/reports", icon: BarChart3 },
  { label: "Settings", href: "/admin/settings", icon: Settings },
  { label: "Audit Logs", href: "/admin/audit-logs", icon: ShieldCheck },
  { label: "Check-In", href: "/admin/check-in", icon: CheckCircle2 },
];

export function ManagementShell({
  children,
  role,
}: {
  children: ReactNode;
  role: Role;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const isEntryPage = pathname === "/admin" || pathname === "/organizer";
  const [authUser, setAuthUser] = useState<FirebaseUser | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    return (
      window.localStorage.getItem("show-time-dashboard-mobile-open") !== "false"
    );
  });
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return (
      window.localStorage.getItem("show-time-dashboard-collapsed") === "true"
    );
  });

  useEffect(() => {
    return onAuthStateChanged(firebaseAuth, (user) => setAuthUser(user));
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      "show-time-dashboard-collapsed",
      String(collapsed),
    );
  }, [collapsed]);

  useEffect(() => {
    window.localStorage.setItem(
      "show-time-dashboard-mobile-open",
      String(mobileOpen),
    );
  }, [mobileOpen]);

  if (isEntryPage) return <>{children}</>;

  const sections = role === "ADMIN" ? adminSections : organizerSections;
  const loginHref =
    role === "ADMIN"
      ? `/admin?returnTo=${encodeURIComponent(pathname)}`
      : `/organizer?returnTo=${encodeURIComponent(pathname)}`;
  const sidebarWidth = collapsed ? "lg:w-20" : "lg:w-72";
  const mainOffset = collapsed ? "lg:pl-20" : "lg:pl-72";

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await firebaseAuth.signOut();
      router.push(role === "ADMIN" ? "/admin" : "/organizer");
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <button
        type="button"
        className="premium-button-secondary fixed left-4 top-4 z-40 grid size-10 place-items-center lg:hidden"
        onClick={() => setMobileOpen((current) => !current)}
        aria-label={
          mobileOpen
            ? "Close dashboard navigation"
            : "Open dashboard navigation"
        }
      >
        {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
      </button>
      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-72 flex-col border-r border-white/10 bg-surface/94 p-5 shadow-2xl shadow-black/30 backdrop-blur-xl transition-[transform,width] duration-200 lg:translate-x-0 ${sidebarWidth} ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className={`text-lg font-semibold hover:text-secondary ${collapsed ? "lg:sr-only" : ""}`}
          >
            Show Time
          </Link>
          <span className="rounded-sm bg-primary/15 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">
            {collapsed ? role.slice(0, 1) : role}
          </span>
        </div>
        <p
          className={`mt-2 text-xs text-muted ${collapsed ? "lg:hidden" : ""}`}
        >
          {role === "ADMIN" ? "Platform operations" : "Organizer workspace"}
        </p>
        <button
          type="button"
          onClick={() => setCollapsed((current) => !current)}
          className="mt-5 hidden h-10 items-center justify-center gap-2 rounded-md border border-border bg-background/55 px-3 text-sm font-semibold text-muted hover:border-secondary hover:text-foreground lg:flex"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronsRight className="size-4" />
          ) : (
            <>
              <ChevronsLeft className="size-4" />
              <span>Collapse panel</span>
            </>
          )}
        </button>
        <nav className="mt-6 grid min-h-0 flex-1 gap-1 overflow-y-auto pr-1">
          {sections.map((section) => {
            const Icon = section.icon;
            const isActive =
              pathname === section.href ||
              pathname.startsWith(`${section.href}/`);
            return (
              <Link
                key={section.href}
                href={section.href}
                title={collapsed ? section.label : undefined}
                className={`group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors hover:bg-surface-muted hover:text-foreground ${isActive ? "bg-primary/15 text-foreground" : "text-muted"} ${collapsed ? "lg:justify-center lg:px-2" : ""}`}
              >
                <Icon className="size-4" />
                <span className={`flex-1 ${collapsed ? "lg:hidden" : ""}`}>
                  {section.label}
                </span>
                <ChevronRight
                  className={`size-3 opacity-0 transition-opacity group-hover:opacity-100 ${collapsed ? "lg:hidden" : ""}`}
                />
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className={mainOffset}>
        <div className="fixed right-5 top-8 z-20 hidden sm:block lg:right-10">
          {authUser ? (
            <button
              type="button"
              onClick={() => void handleSignOut()}
              disabled={signingOut}
              className="group inline-flex h-10 items-center gap-2 rounded-md border border-accent/40 bg-accent/10 px-4 text-sm font-semibold text-foreground shadow-[0_0_0_rgba(244,63,94,0)] backdrop-blur hover:-translate-y-0.5 hover:border-accent hover:bg-accent hover:text-accent-foreground hover:shadow-[0_14px_34px_rgba(244,63,94,0.26)] disabled:opacity-50"
            >
              {signingOut ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <LogOut className="size-4 transition-transform group-hover:-rotate-6 group-hover:scale-110" />
              )}
              Logout
            </button>
          ) : (
            <Link
              href={loginHref}
              className="premium-button inline-flex h-10 gap-2 px-4 text-sm font-semibold"
            >
              <LogIn className="size-4" />
              Login
            </Link>
          )}
        </div>
        {children}
      </main>
    </div>
  );
}
