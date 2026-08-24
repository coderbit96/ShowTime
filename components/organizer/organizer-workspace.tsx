"use client";

import {
  BarChart3,
  CircleDollarSign,
  ClipboardList,
  LoaderCircle,
  Save,
  Ticket,
  UserRound,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { firebaseAuth } from "@/lib/firebase/client";

type Workspace =
  | "bookings"
  | "finance"
  | "marketing"
  | "analytics"
  | "profile"
  | "settings"
  | "payouts";
type AnyRecord = Record<string, unknown>;

export function OrganizerWorkspace({ section }: { section: Workspace }) {
  const [data, setData] = useState<AnyRecord>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const request = useCallback(async (path: string, init: RequestInit = {}) => {
    const token = await firebaseAuth.currentUser?.getIdToken();
    if (!token) throw new Error("Sign in with an approved organizer account.");
    const response = await fetch(path, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...init.headers,
      },
    });
    const payload = (await response.json()) as AnyRecord & { error?: string };
    if (!response.ok) throw new Error(payload.error ?? "Request failed.");
    return payload;
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(
      () =>
        void request(
          section === "bookings"
            ? "/api/organizer/bookings"
            : section === "profile"
              ? "/api/organizer/profile"
              : "/api/dashboard/analytics",
        )
          .then(setData)
          .catch((loadError) =>
            setError(
              loadError instanceof Error
                ? loadError.message
                : "Unable to load organizer data.",
            ),
          )
          .finally(() => setLoading(false)),
      0,
    );
    return () => window.clearTimeout(timer);
  }, [request, section]);
  if (loading)
    return (
      <main className="grid min-h-screen place-items-center bg-background">
        <LoaderCircle className="size-5 animate-spin" />
      </main>
    );
  const title = {
    bookings: "Bookings and attendees",
    finance: "Revenue and commission",
    marketing: "Coupons and promotions",
    analytics: "Organizer analytics",
    profile: "Organizer profile",
    settings: "Organizer settings",
    payouts: "Payouts",
  }[section];
  const bookings = (data.bookings as AnyRecord[] | undefined) ?? [];
  const organizer = (data.organizer as AnyRecord | undefined) ?? {};
  const kpis = (data.kpis as AnyRecord | undefined) ?? {};
  return (
    <main className="min-h-screen bg-background px-5 py-8 text-foreground sm:px-8">
      <div className="mx-auto max-w-7xl">
        <p className="text-sm font-semibold text-secondary">
          Organizer workspace
        </p>
        <h1 className="mt-2 text-3xl font-semibold">{title}</h1>
        {error ? (
          <p className="mt-5 rounded-md border border-accent/50 bg-accent/10 p-3 text-sm">
            {error}
          </p>
        ) : null}
        {section === "bookings" ? (
          <div className="mt-7 grid gap-3">
            {bookings.length ? (
              bookings.map((booking) => {
                const user = booking.user as AnyRecord | null;
                const ticket = booking.ticket as AnyRecord | null;
                return (
                  <article
                    key={String(booking._id)}
                    className="flex flex-wrap items-center justify-between gap-4 rounded-md border border-border bg-surface p-4"
                  >
                    <div>
                      <p className="font-semibold">
                        {String(user?.name ?? "Customer")}
                      </p>
                      <p className="mt-1 text-sm text-muted">
                        {String(user?.email ?? "")} · INR{" "}
                        {String(
                          (booking.pricing as AnyRecord | null)?.total ?? 0,
                        )}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        Seats{" "}
                        {String(
                          (booking.seats as AnyRecord[] | undefined)
                            ?.map((seat) => seat.seatId)
                            .join(", ") ?? "-",
                        )}
                      </p>
                    </div>
                    <div className="text-right text-xs">
                      <p className="font-semibold text-secondary">
                        {String(booking.status)}
                      </p>
                      <p className="mt-1 text-muted">
                        {ticket?.checkedIn ? "Checked in" : "Not checked in"}
                      </p>
                    </div>
                  </article>
                );
              })
            ) : (
              <p className="rounded-md border border-dashed border-border p-5 text-sm text-muted">
                No bookings yet.
              </p>
            )}
          </div>
        ) : section === "profile" ? (
          <ProfileForm profile={organizer} request={request} />
        ) : section === "marketing" ? (
          <div className="mt-7 rounded-md border border-border bg-surface p-6">
            <Ticket className="size-5 text-secondary" />
            <h2 className="mt-3 font-semibold">Promotion tools</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              Coupon validation is already part of checkout. A coupon editor can
              be added here once offer ownership and redemption budget rules are
              set for your organization.
            </p>
          </div>
        ) : (
          <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Metric
              label="Revenue"
              value={`INR ${String(kpis.totalRevenue ?? 0)}`}
              icon={CircleDollarSign}
            />
            <Metric
              label="Organizer share"
              value={`INR ${String(kpis.organizerRevenue ?? 0)}`}
              icon={CircleDollarSign}
            />
            <Metric
              label="Bookings"
              value={String(kpis.totalBookings ?? 0)}
              icon={ClipboardList}
            />
            <Metric
              label="Tickets sold"
              value={String(kpis.ticketSales ?? 0)}
              icon={section === "analytics" ? BarChart3 : UserRound}
            />
          </div>
        )}
      </div>
    </main>
  );
}

function Metric({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof BarChart3;
}) {
  return (
    <div className="rounded-md border border-border bg-surface p-5">
      <Icon className="size-5 text-secondary" />
      <p className="mt-5 text-xs uppercase tracking-[0.12em] text-muted">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}
function ProfileForm({
  profile,
  request,
}: {
  profile: AnyRecord;
  request: (path: string, init?: RequestInit) => Promise<AnyRecord>;
}) {
  const user = (profile.user as AnyRecord | null) ?? {};
  const [name, setName] = useState(String(user.name ?? ""));
  const [description, setDescription] = useState(
    String(profile.description ?? ""),
  );
  const [message, setMessage] = useState("");
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await request("/api/organizer/profile", {
        method: "PATCH",
        body: JSON.stringify({ description }),
      });
      setMessage("Profile updated.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to update profile.",
      );
    }
  };
  return (
    <form
      onSubmit={save}
      className="mt-7 max-w-2xl grid gap-4 rounded-md border border-border bg-surface p-5"
    >
      <label className="grid gap-1 text-sm">
        Organization
        <input
          value={String(profile.organizationName ?? "")}
          readOnly
          className="h-10 rounded-md border border-border bg-background px-3 text-muted"
        />
      </label>
      <label className="grid gap-1 text-sm">
        Contact name
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          readOnly
          className="h-10 rounded-md border border-border bg-background px-3"
        />
      </label>
      <label className="grid gap-1 text-sm">
        Description
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          className="min-h-28 rounded-md border border-border bg-background px-3 py-2"
        />
      </label>
      {message ? <p className="text-sm text-secondary">{message}</p> : null}
      <button className="inline-flex h-10 w-fit items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground">
        <Save className="size-4" /> Save
      </button>
    </form>
  );
}
