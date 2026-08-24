"use client";

import Link from "next/link";
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
import { useEffect, useState } from "react";
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import { usePathname, useRouter } from "next/navigation";
import { firebaseAuth } from "@/lib/firebase/client";

type Role = "ADMIN" | "ORGANIZER";
type AnalyticsData = {
  generatedAt: string;
  kpis: Record<string, number | null>;
  charts: {
    dailyRevenue: Array<{ _id: string; revenue: number; bookings: number }>;
    monthlyRevenue: Array<{ _id: string; revenue: number; bookings: number }>;
    bookingTrends: Array<{
      _id: string;
      confirmed: number;
      cancelled: number;
      total: number;
    }>;
    popularEvents: Array<{ _id: string; bookings: number; revenue: number }>;
    popularMovies: Array<{ _id: string; bookings: number; revenue: number }>;
    popularCategories: Array<{
      _id: string;
      bookings: number;
      revenue: number;
    }>;
    popularCities: Array<{ _id: string; bookings: number; revenue: number }>;
    organizerPerformance: Array<{ _id: string; name: string; events: number }>;
  };
};

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

export function OperationsDashboard({ role }: { role: Role }) {
  const router = useRouter();
  const pathname = usePathname();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");
  const [authUser, setAuthUser] = useState<FirebaseUser | null>(null);
  const [authResolved, setAuthResolved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return (
      window.localStorage.getItem("show-time-dashboard-collapsed") === "true"
    );
  });

  useEffect(() => {
    window.localStorage.setItem(
      "show-time-dashboard-collapsed",
      String(collapsed),
    );
  }, [collapsed]);

  useEffect(() => {
    return onAuthStateChanged(firebaseAuth, (user) => {
      setAuthUser(user);
      setAuthResolved(true);
    });
  }, []);

  useEffect(() => {
    let active = true;

    if (!authResolved) {
      return () => {
        active = false;
      };
    }

    const timer = window.setTimeout(() => {
      if (!active) return;
      setLoading(true);
      setError("");
      setAnalytics(null);
      setProfile(null);

      if (!authUser) {
        setLoading(false);
        setError("Sign in with an approved management account to continue.");
        return;
      }

      void (async () => {
        try {
          const token = await authUser.getIdToken();
          const [analyticsResponse, profileResponse] = await Promise.all([
            fetch("/api/dashboard/analytics", {
              headers: { Authorization: `Bearer ${token}` },
            }),
            role === "ORGANIZER"
              ? fetch("/api/organizer/profile", {
                  headers: { Authorization: `Bearer ${token}` },
                })
              : Promise.resolve(null),
          ]);
          const analyticsPayload =
            (await analyticsResponse.json()) as AnalyticsData & {
              error?: string;
            };
          if (!analyticsResponse.ok)
            throw new Error(
              analyticsPayload.error ?? "Unable to load analytics.",
            );
          if (!active) return;
          setAnalytics(analyticsPayload);
          if (profileResponse)
            setProfile(
              (
                (await profileResponse.json()) as {
                  organizer?: Record<string, unknown>;
                }
              ).organizer ?? null,
            );
        } catch (loadError) {
          if (!active) return;
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load dashboard.",
          );
        } finally {
          if (active) setLoading(false);
        }
      })();
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [authResolved, authUser, role]);

  const sections = role === "ADMIN" ? adminSections : organizerSections;
  const loginHref = `/auth/login?returnTo=${encodeURIComponent(pathname)}`;
  const sidebarWidth = collapsed ? "lg:w-20" : "lg:w-72";
  const mainOffset = collapsed ? "lg:pl-20" : "lg:pl-72";

  async function handleSignOut() {
    setSigningOut(true);
    await firebaseAuth.signOut();
    router.push(loginHref);
    setSigningOut(false);
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <button
        type="button"
        className="premium-button-secondary fixed left-4 top-4 z-40 grid size-10 place-items-center lg:hidden"
        onClick={() => setMobileOpen((current) => !current)}
        aria-label="Open dashboard navigation"
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
            const isActive = pathname === section.href;
            return (
              <Link
                key={section.href}
                href={section.href}
                onClick={() => setMobileOpen(false)}
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
        <div className="mt-4 border-t border-white/10 pt-4">
          {authUser ? (
            <button
              type="button"
              onClick={() => void handleSignOut()}
              disabled={signingOut}
              className={`flex h-10 w-full items-center gap-3 rounded-md px-3 text-sm font-semibold text-muted hover:bg-accent/15 hover:text-foreground disabled:opacity-50 ${collapsed ? "lg:justify-center lg:px-2" : ""}`}
              title="Logout"
            >
              {signingOut ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <LogOut className="size-4" />
              )}
              <span className={collapsed ? "lg:hidden" : ""}>Logout</span>
            </button>
          ) : (
            <Link
              href={loginHref}
              className={`premium-button h-10 w-full gap-2 px-3 text-sm font-semibold ${collapsed ? "lg:px-2" : ""}`}
              title="Login"
            >
              <LogIn className="size-4" />
              <span className={collapsed ? "lg:hidden" : ""}>Login</span>
            </Link>
          )}
        </div>
      </aside>
      <main className={mainOffset}>
        <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-secondary">
                {role === "ADMIN" ? "Admin overview" : "Organizer overview"}
              </p>
              <h1 className="mt-2 text-3xl font-semibold">
                Good to see you
                {profile && typeof profile.organizationName === "string"
                  ? `, ${profile.organizationName}`
                  : ""}
                .
              </h1>
              <p className="mt-2 text-sm text-muted">
                Live operational numbers from your bookings and payments.
              </p>
            </div>
            <div className="hidden items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-xs text-muted sm:flex">
              <BarChart3 className="size-4 text-secondary" /> Updated{" "}
              {analytics
                ? new Date(analytics.generatedAt).toLocaleTimeString("en-IN")
                : loading
                  ? "loading"
                  : "not loaded"}
            </div>
          </div>
          {error ? (
            <DashboardNotice message={error} loginHref={loginHref} />
          ) : null}
          {analytics ? (
            <DashboardContent data={analytics} role={role} />
          ) : error ? null : (
            <div className="grid min-h-96 place-items-center">
              <div className="flex items-center gap-3 rounded-md border border-border bg-surface px-4 py-3 text-sm text-muted">
                <LoaderCircle className="size-5 animate-spin" />
                Loading dashboard...
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function DashboardNotice({
  message,
  loginHref,
}: {
  message: string;
  loginHref: string;
}) {
  return (
    <div className="mt-6 rounded-md border border-accent/50 bg-accent/10 p-5 text-sm">
      <p className="font-semibold text-foreground">{message}</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Link
          href={loginHref}
          className="premium-button h-10 gap-2 px-4 text-sm font-semibold"
        >
          <LogIn className="size-4" />
          Login
        </Link>
        <Link
          href="/"
          className="premium-button-secondary h-10 gap-2 px-4 text-sm font-semibold"
        >
          Go to customer site
        </Link>
      </div>
    </div>
  );
}

function DashboardContent({ data, role }: { data: AnalyticsData; role: Role }) {
  const cards: Array<{
    label: string;
    value: string;
    icon: typeof CircleDollarSign;
  }> =
    role === "ADMIN"
      ? [
          {
            label: "Total revenue",
            value: `INR ${data.kpis.totalRevenue ?? 0}`,
            icon: CircleDollarSign,
          },
          {
            label: "Platform revenue",
            value: `INR ${data.kpis.platformRevenue ?? 0}`,
            icon: WalletCards,
          },
          {
            label: "Bookings",
            value: String(data.kpis.totalBookings ?? 0),
            icon: ClipboardList,
          },
          {
            label: "Ticket sales",
            value: String(data.kpis.ticketSales ?? 0),
            icon: Ticket,
          },
          {
            label: "Active events",
            value: String(data.kpis.activeEvents ?? 0),
            icon: CalendarDays,
          },
          {
            label: "Customers",
            value: String(data.kpis.totalCustomers ?? 0),
            icon: Users,
          },
          {
            label: "Pending events",
            value: String(data.kpis.pendingEvents ?? 0),
            icon: FileText,
          },
          {
            label: "Refund amount",
            value: `INR ${data.kpis.refundAmount ?? 0}`,
            icon: WalletCards,
          },
        ]
      : [
          {
            label: "Gross revenue",
            value: `INR ${data.kpis.totalRevenue ?? 0}`,
            icon: CircleDollarSign,
          },
          {
            label: "Organizer share",
            value: `INR ${data.kpis.organizerRevenue ?? 0}`,
            icon: WalletCards,
          },
          {
            label: "Bookings",
            value: String(data.kpis.totalBookings ?? 0),
            icon: ClipboardList,
          },
          {
            label: "Tickets sold",
            value: String(data.kpis.ticketSales ?? 0),
            icon: Ticket,
          },
          {
            label: "Active events",
            value: String(data.kpis.activeEvents ?? 0),
            icon: CalendarDays,
          },
          {
            label: "Commission",
            value: `INR ${Math.max(0, Number(data.kpis.totalRevenue ?? 0) - Number(data.kpis.organizerRevenue ?? 0))}`,
            icon: CircleDollarSign,
          },
        ];
  return (
    <div className="mt-8 space-y-8">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, icon: CardIcon }) => {
          return (
            <div
              key={String(label)}
              className="rounded-md border border-border bg-surface p-4"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                  {label}
                </p>
                <CardIcon className="size-4 text-secondary" />
              </div>
              <p className="mt-3 text-2xl font-semibold">{value}</p>
            </div>
          );
        })}
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(20rem,1fr)]">
        <Chart
          title="Daily revenue"
          items={data.charts.dailyRevenue.map((item) => ({
            label: item._id.slice(5),
            value: item.revenue,
          }))}
          currency
        />
        <Chart
          title="Booking trends"
          items={data.charts.bookingTrends.map((item) => ({
            label: item._id.slice(5),
            value: item.confirmed,
          }))}
        />
      </div>
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <Ranking title="Popular events" items={data.charts.popularEvents} />
        <Ranking title="Popular movies" items={data.charts.popularMovies} />
        <Ranking title="Categories" items={data.charts.popularCategories} />
        <Ranking title="Cities" items={data.charts.popularCities} />
      </div>
      {role === "ADMIN" ? (
        <Ranking
          title="Organizer performance"
          items={data.charts.organizerPerformance.map((item) => ({
            _id: item.name,
            bookings: item.events,
            revenue: item.events,
          }))}
        />
      ) : null}
    </div>
  );
}

function Chart({
  title,
  items,
  currency = false,
}: {
  title: string;
  items: Array<{ label: string; value: number }>;
  currency?: boolean;
}) {
  const max = Math.max(...items.map((item) => item.value), 1);
  return (
    <section className="rounded-md border border-border bg-surface p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">{title}</h2>
        <BarChart3 className="size-4 text-muted" />
      </div>
      <div className="mt-6 flex h-44 items-end gap-1.5">
        {items.length ? (
          items.map((item) => (
            <div
              key={item.label}
              className="group flex min-w-0 flex-1 flex-col items-center gap-2"
            >
              <div
                className="relative w-full"
                style={{ height: `${Math.max((item.value / max) * 100, 4)}%` }}
              >
                <div
                  className="h-full w-full rounded-t-sm bg-primary transition-colors group-hover:bg-secondary"
                  title={`${item.label}: ${currency ? `INR ${item.value}` : item.value}`}
                />
              </div>
              <span className="max-w-12 truncate text-[10px] text-muted">
                {item.label}
              </span>
            </div>
          ))
        ) : (
          <p className="self-center text-sm text-muted">No data yet.</p>
        )}
      </div>
    </section>
  );
}

function Ranking({
  title,
  items,
}: {
  title: string;
  items: Array<{ _id: string; bookings: number; revenue: number }>;
}) {
  return (
    <section className="rounded-md border border-border bg-surface p-5">
      <h2 className="font-semibold">{title}</h2>
      <div className="mt-4 grid gap-3">
        {items.length ? (
          items.slice(0, 5).map((item, index) => (
            <div
              key={`${item._id}-${index}`}
              className="flex items-center gap-3 text-sm"
            >
              <span className="grid size-6 place-items-center rounded-sm bg-surface-muted text-xs text-muted">
                {index + 1}
              </span>
              <span className="min-w-0 flex-1 truncate">
                {item._id || "Unassigned"}
              </span>
              <span className="text-xs font-semibold text-secondary">
                {item.bookings}
              </span>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted">No data yet.</p>
        )}
      </div>
    </section>
  );
}
