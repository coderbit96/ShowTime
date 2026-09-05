"use client";

import {
  Ban,
  Check,
  Eye,
  LoaderCircle,
  RotateCcw,
  Save,
  Search,
  ShieldCheck,
  UserCheck,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { updatePassword } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase/client";
import { CouponManager } from "@/components/admin/coupon-manager";

type Section =
  | "users"
  | "events"
  | "reviews"
  | "audit"
  | "bookings"
  | "settings"
  | "management"
  | "marketing";
type AnyRecord = Record<string, unknown>;

export function AdminControlCenter({ section }: { section: Section }) {
  const [data, setData] = useState<AnyRecord>({});
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);

  const request = useCallback(async (path: string, init: RequestInit = {}) => {
    const token = await firebaseAuth.currentUser?.getIdToken();
    if (!token) throw new Error("Sign in as an Admin to use this screen.");
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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await request(`/api/admin/overview?section=${section}`));
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load administration data.",
      );
    } finally {
      setLoading(false);
    }
  }, [request, section]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const update = async (path: string, body: AnyRecord) => {
    try {
      setError("");
      await request(path, { method: "PATCH", body: JSON.stringify(body) });
      setNotice("Change saved and recorded in the audit log.");
      await load();
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Unable to save change.",
      );
    }
  };

  if (section === "settings") return <AdminSettings request={request} />;
  const title = {
    users: "Users and organizers",
    events: "Event approvals",
    reviews: "Review moderation",
    audit: "Audit logs",
    bookings: "Bookings and transactions",
    management: "Platform management",
    marketing: "Marketing workspace",
  }[section];
  return (
    <main className="min-h-screen bg-background px-5 py-8 text-foreground sm:px-8">
      <div className="mx-auto max-w-7xl">
        <p className="text-sm font-semibold text-secondary">
          Admin control center
        </p>
        <h1 className="mt-2 text-3xl font-semibold">{title}</h1>
        {error ? (
          <p className="mt-5 rounded-md border border-accent/50 bg-accent/10 p-3 text-sm">
            {error}
          </p>
        ) : null}
        {notice ? (
          <p className="mt-5 rounded-md border border-secondary/40 bg-secondary/10 p-3 text-sm">
            {notice}
          </p>
        ) : null}
        {loading ? (
          <div className="grid min-h-72 place-items-center">
            <LoaderCircle className="size-5 animate-spin" />
          </div>
        ) : section === "users" ? (
          <UsersView data={data} update={update} request={request} />
        ) : section === "events" ? (
          <EventsView data={data} update={update} />
        ) : section === "reviews" ? (
          <ReviewsView data={data} update={update} />
        ) : section === "audit" ? (
          <AuditView data={data} />
        ) : section === "bookings" ? (
          <BookingsView data={data} />
        ) : (
          <WorkspaceView section={section} />
        )}
      </div>
    </main>
  );
}

function UsersView({
  data,
  update,
  request,
}: {
  data: AnyRecord;
  update: (path: string, body: AnyRecord) => Promise<void>;
  request: (path: string, init?: RequestInit) => Promise<AnyRecord>;
}) {
  const users = (data.users as AnyRecord[] | undefined) ?? [];
  const organizers = (data.organizers as AnyRecord[] | undefined) ?? [];
  const [query, setQuery] = useState("");
  const [customerStatus, setCustomerStatus] = useState<
    "ALL" | "ACTIVE" | "INACTIVE" | "BLOCKED"
  >("ALL");
  const [organizerStatus, setOrganizerStatus] = useState<
    "ALL" | "PENDING" | "VERIFIED" | "REJECTED" | "SUSPENDED"
  >("ALL");
  const [registeredFrom, setRegisteredFrom] = useState("");
  const [registeredTo, setRegisteredTo] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedOrganizerId, setSelectedOrganizerId] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const matchesQuery = (item: AnyRecord) => {
    if (!normalizedQuery) return true;
    const user = item.user as AnyRecord | null;
    return [
      item.name,
      item.email,
      item.phone,
      item.organizationName,
      user?.name,
      user?.email,
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(normalizedQuery));
  };
  const allCustomers = users.filter((user) => user.role === "CUSTOMER");
  const customers = allCustomers.filter((user) => {
    if (!matchesQuery(user)) return false;
    const status = String(
      user.accountStatus ?? (user.active ? "ACTIVE" : "INACTIVE"),
    );
    if (customerStatus !== "ALL" && status !== customerStatus) return false;
    const registeredAt = new Date(String(user.createdAt));
    if (registeredFrom && registeredAt < new Date(registeredFrom)) return false;
    if (registeredTo) {
      const end = new Date(registeredTo);
      end.setHours(23, 59, 59, 999);
      if (registeredAt > end) return false;
    }
    return true;
  });
  const visibleOrganizers = organizers.filter((organizer) => {
    if (!matchesQuery(organizer)) return false;
    if (organizerStatus === "ALL") return true;
    return organizer.verificationStatus === organizerStatus;
  });
  const pendingOrganizers = visibleOrganizers.filter(
    (organizer) => organizer.verificationStatus === "PENDING",
  );
  const managedOrganizers = visibleOrganizers.filter(
    (organizer) => organizer.verificationStatus !== "PENDING",
  );
  const statusCounts = organizers.reduce<Record<string, number>>(
    (counts, organizer) => {
      const status = String(organizer.verificationStatus);
      counts[status] = (counts[status] ?? 0) + 1;
      return counts;
    },
    {},
  );
  return (
    <div className="mt-7 space-y-6">
      <section className="grid gap-3 rounded-md border border-border bg-surface p-4 lg:grid-cols-[minmax(0,1fr)_auto]">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name, email, or mobile..."
            className="h-11 w-full rounded-md border border-border bg-background px-10 text-sm"
          />
        </label>
        <div className="grid gap-2 sm:grid-cols-2">
          <select
            value={customerStatus}
            onChange={(event) =>
              setCustomerStatus(
                event.target.value as "ALL" | "ACTIVE" | "INACTIVE",
              )
            }
            className="h-11 rounded-md border border-border bg-background px-3 text-sm"
            aria-label="Filter customers"
          >
            <option value="ALL">All customers</option>
            <option value="ACTIVE">Active customers</option>
            <option value="INACTIVE">Inactive customers</option>
            <option value="BLOCKED">Blocked customers</option>
          </select>
          <select
            value={organizerStatus}
            onChange={(event) =>
              setOrganizerStatus(
                event.target.value as
                  "ALL" | "PENDING" | "VERIFIED" | "REJECTED" | "SUSPENDED",
              )
            }
            className="h-11 rounded-md border border-border bg-background px-3 text-sm"
            aria-label="Filter organizers"
          >
            <option value="ALL">All organizers</option>
            <option value="PENDING">Pending approval</option>
            <option value="VERIFIED">Verified</option>
            <option value="REJECTED">Rejected</option>
            <option value="SUSPENDED">Suspended</option>
          </select>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:col-span-2">
          <label className="grid gap-1 text-xs text-muted">
            Registered from
            <input
              type="date"
              value={registeredFrom}
              onChange={(event) => setRegisteredFrom(event.target.value)}
              className="h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground"
            />
          </label>
          <label className="grid gap-1 text-xs text-muted">
            Registered to
            <input
              type="date"
              value={registeredTo}
              onChange={(event) => setRegisteredTo(event.target.value)}
              className="h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground"
            />
          </label>
        </div>
      </section>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <MetricPill label="Customers" value={allCustomers.length} />
        <MetricPill label="Pending" value={statusCounts.PENDING ?? 0} />
        <MetricPill label="Verified" value={statusCounts.VERIFIED ?? 0} />
        <MetricPill label="Rejected" value={statusCounts.REJECTED ?? 0} />
        <MetricPill label="Suspended" value={statusCounts.SUSPENDED ?? 0} />
      </section>
      <div className="grid gap-8 xl:grid-cols-2">
        <section>
          <h2 className="text-lg font-semibold">Customers</h2>
          <div className="mt-4 grid gap-3">
            {customers.map((user) => (
              <article
                key={String(user._id)}
                className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface p-4"
              >
                <div>
                  <p className="font-medium">{String(user.name)}</p>
                  <p className="text-xs text-muted">{String(user.email)}</p>
                  <p className="mt-1 text-xs text-muted">
                    {String(user.phone ?? "No mobile")} · Registered{" "}
                    {new Date(String(user.createdAt)).toLocaleDateString(
                      "en-IN",
                    )}
                  </p>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedCustomerId(String(user._id))}
                    className="grid size-9 place-items-center rounded-md border border-secondary/45 text-secondary"
                    title="View customer profile"
                  >
                    <Eye className="size-4" />
                  </button>
                  {user.accountStatus === "BLOCKED" ? (
                    <button
                      type="button"
                      onClick={() =>
                        void update(
                          `/api/admin/users/${String(user._id)}/status`,
                          {
                            action: "UNBLOCK",
                          },
                        )
                      }
                      className="inline-flex h-9 items-center gap-1 rounded-md border border-secondary/50 px-3 text-xs font-semibold text-secondary"
                    >
                      <UserCheck className="size-3.5" /> Unblock
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        void update(
                          `/api/admin/users/${String(user._id)}/status`,
                          {
                            action: user.active ? "DEACTIVATE" : "ACTIVATE",
                          },
                        )
                      }
                      className="inline-flex h-9 items-center gap-1 rounded-md border border-border px-3 text-xs font-semibold"
                    >
                      <UserCheck className="size-3.5" />
                      {user.active ? "Deactivate" : "Activate"}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      void update(
                        `/api/admin/users/${String(user._id)}/status`,
                        {
                          action: "BLOCK",
                        },
                      )
                    }
                    className="grid size-9 place-items-center rounded-md border border-accent/50 text-accent"
                    title="Block user"
                  >
                    <Ban className="size-4" />
                  </button>
                </div>
              </article>
            ))}
            {customers.length === 0 ? (
              <p className="rounded-md border border-border bg-surface p-4 text-sm text-muted">
                No customers found.
              </p>
            ) : null}
          </div>
        </section>
        <section className="space-y-8">
          <div>
            <h2 className="text-lg font-semibold">Organizer approvals</h2>
            <div className="mt-4 grid gap-3">
              {pendingOrganizers.map((organizer) => (
                <OrganizerCard
                  key={String(organizer._id)}
                  organizer={organizer}
                  update={update}
                  mode="approval"
                  onView={() => setSelectedOrganizerId(String(organizer._id))}
                />
              ))}
              {pendingOrganizers.length === 0 ? (
                <p className="rounded-md border border-border bg-surface p-4 text-sm text-muted">
                  No pending organizer approvals.
                </p>
              ) : null}
            </div>
          </div>
          <div>
            <h2 className="text-lg font-semibold">Organizer accounts</h2>
            <div className="mt-4 grid gap-3">
              {managedOrganizers.map((organizer) => (
                <OrganizerCard
                  key={String(organizer._id)}
                  organizer={organizer}
                  update={update}
                  mode="management"
                  onView={() => setSelectedOrganizerId(String(organizer._id))}
                />
              ))}
              {managedOrganizers.length === 0 ? (
                <p className="rounded-md border border-border bg-surface p-4 text-sm text-muted">
                  No approved, rejected, or suspended organizers yet.
                </p>
              ) : null}
            </div>
          </div>
        </section>
      </div>
      {selectedCustomerId ? (
        <CustomerProfile
          customerId={selectedCustomerId}
          request={request}
          update={update}
          onClose={() => setSelectedCustomerId("")}
        />
      ) : null}
      {selectedOrganizerId ? (
        <OrganizerProfile
          organizerId={selectedOrganizerId}
          request={request}
          update={update}
          onClose={() => setSelectedOrganizerId("")}
        />
      ) : null}
    </div>
  );
}

function MetricPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-surface px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function CustomerProfile({
  customerId,
  request,
  update,
  onClose,
}: {
  customerId: string;
  request: (path: string, init?: RequestInit) => Promise<AnyRecord>;
  update: (path: string, body: AnyRecord) => Promise<void>;
  onClose: () => void;
}) {
  const [data, setData] = useState<AnyRecord | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void request(`/api/admin/users/${customerId}/profile`)
      .then((result) => active && setData(result))
      .catch(
        (loadError) =>
          active &&
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load customer profile.",
          ),
      );
    return () => {
      active = false;
    };
  }, [customerId, request]);

  const user = (data?.user as AnyRecord | undefined) ?? {};
  const bookings = (data?.bookings as AnyRecord[] | undefined) ?? [];
  const payments = (data?.payments as AnyRecord[] | undefined) ?? [];
  const refunds = (data?.refunds as AnyRecord[] | undefined) ?? [];
  const favorites = (data?.favorites as AnyRecord[] | undefined) ?? [];
  const reviews = (data?.reviews as AnyRecord[] | undefined) ?? [];
  const cancellations = (data?.cancellations as AnyRecord[] | undefined) ?? [];

  return (
    <section className="rounded-md border border-secondary/35 bg-surface p-5 shadow-xl shadow-slate-900/10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-secondary">
            Customer profile
          </p>
          <h2 className="mt-1 text-xl font-semibold">
            {String(user.name ?? "Loading customer...")}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {String(user.email ?? "")}
            {user.phone ? ` · ${String(user.phone)}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() =>
              void update(`/api/admin/users/${customerId}/status`, {
                action: "RESET_ACCESS",
              })
            }
            className="inline-flex h-9 items-center gap-1 rounded-md border border-secondary/50 px-3 text-xs font-semibold text-secondary"
          >
            <RotateCcw className="size-3.5" /> Reset access
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 items-center gap-1 rounded-md border border-border px-3 text-xs font-semibold text-muted"
          >
            <X className="size-3.5" /> Close
          </button>
        </div>
      </div>
      {error ? <p className="mt-4 text-sm text-accent">{error}</p> : null}
      {!data && !error ? (
        <div className="mt-6 grid min-h-32 place-items-center">
          <LoaderCircle className="size-5 animate-spin text-secondary" />
        </div>
      ) : (
        <div className="mt-6 grid gap-5 xl:grid-cols-2">
          <HistoryList
            title={`Booking history (${bookings.length})`}
            items={bookings}
            describe={(item) =>
              `INR ${String((item.pricing as AnyRecord | undefined)?.total ?? 0)} · ${String(item.status)}`
            }
          />
          <HistoryList
            title={`Payment history (${payments.length})`}
            items={payments}
            describe={(item) =>
              `INR ${String(item.amount ?? 0)} · ${String(item.status)}`
            }
          />
          <HistoryList
            title={`Refund history (${refunds.length})`}
            items={refunds}
            describe={(item) =>
              `INR ${String(item.approvedAmount ?? item.requestedAmount ?? 0)} · ${String(item.status)}`
            }
          />
          <HistoryList
            title={`Cancellation history (${cancellations.length})`}
            items={cancellations}
            describe={(item) => String(item.status)}
          />
          <HistoryList
            title={`Saved items (${favorites.length})`}
            items={favorites}
            describe={(item) => {
              const saved =
                (item.event as AnyRecord | null)?.title ??
                (item.movie as AnyRecord | null)?.title ??
                (item.venue as AnyRecord | null)?.name ??
                "Saved item";
              return String(saved);
            }}
          />
          <HistoryList
            title={`Reviews (${reviews.length})`}
            items={reviews}
            describe={(item) =>
              `${String(item.rating ?? "-")}/5 · ${String(item.status ?? "PENDING")}`
            }
          />
        </div>
      )}
    </section>
  );
}

function OrganizerProfile({
  organizerId,
  request,
  update,
  onClose,
}: {
  organizerId: string;
  request: (path: string, init?: RequestInit) => Promise<AnyRecord>;
  update: (path: string, body: AnyRecord) => Promise<void>;
  onClose: () => void;
}) {
  const [data, setData] = useState<AnyRecord | null>(null);
  const [commission, setCommission] = useState(10);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void request(`/api/admin/organizers/${organizerId}/profile`)
      .then((result) => {
        if (!active) return;
        setData(result);
        const organizer = result.organizer as AnyRecord | undefined;
        setCommission(Number(organizer?.commissionRatePercent ?? 10));
      })
      .catch(
        (loadError) =>
          active &&
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load organizer profile.",
          ),
      );
    return () => {
      active = false;
    };
  }, [organizerId, request]);

  const organizer = (data?.organizer as AnyRecord | undefined) ?? {};
  const organizerUser = (organizer.user as AnyRecord | null) ?? {};
  const sales = (data?.sales as AnyRecord | undefined) ?? {};
  const events = (data?.events as AnyRecord[] | undefined) ?? [];
  const payouts = (data?.payouts as AnyRecord[] | undefined) ?? [];
  const business = (organizer.business as AnyRecord | null) ?? {};
  const bank = (organizer.bankDetails as AnyRecord | null) ?? {};
  const kycDocuments =
    (organizer.kycDocuments as AnyRecord[] | undefined) ?? [];

  const saveCommission = async () => {
    try {
      await update(`/api/admin/organizers/${organizerId}/status`, {
        status: organizer.verificationStatus,
        commissionRatePercent: commission,
      });
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save commission.",
      );
    }
  };

  const updateKycStatus = async (kycStatus: "VERIFIED" | "REJECTED") => {
    try {
      await update(`/api/admin/organizers/${organizerId}/status`, {
        status: organizer.verificationStatus,
        kycStatus,
      });
      setData((current) =>
        current
          ? {
              ...current,
              organizer: { ...organizer, kycStatus },
            }
          : current,
      );
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Unable to update KYC status.",
      );
    }
  };

  return (
    <section className="rounded-md border border-secondary/35 bg-surface p-5 shadow-xl shadow-slate-900/10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-secondary">
            Organizer profile & verification
          </p>
          <h2 className="mt-1 text-xl font-semibold">
            {String(organizer.organizationName ?? "Loading organizer...")}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {String(organizerUser.name ?? "")} ·{" "}
            {String(organizerUser.email ?? "")}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-9 items-center gap-1 rounded-md border border-border px-3 text-xs font-semibold text-muted"
        >
          <X className="size-3.5" /> Close
        </button>
      </div>
      {error ? <p className="mt-4 text-sm text-accent">{error}</p> : null}
      {!data && !error ? (
        <div className="mt-6 grid min-h-32 place-items-center">
          <LoaderCircle className="size-5 animate-spin text-secondary" />
        </div>
      ) : (
        <div className="mt-6 grid gap-5 xl:grid-cols-2">
          <section className="rounded-md border border-border bg-background/45 p-4 text-sm">
            <h3 className="font-semibold">Business & verification</h3>
            <dl className="mt-3 grid gap-2 text-muted">
              <div>
                Legal name: {String(business.legalName ?? "Not provided")}
              </div>
              <div>
                Registration:{" "}
                {String(business.registrationNumber ?? "Not provided")}
              </div>
              <div>Tax ID: {String(business.taxId ?? "Not provided")}</div>
              <div>
                KYC status: {String(organizer.kycStatus ?? "NOT_SUBMITTED")}
              </div>
              <div>
                Verification:{" "}
                {String(organizer.verificationStatus ?? "PENDING")}
              </div>
            </dl>
            <div className="mt-4 flex flex-wrap gap-2">
              {kycDocuments.length ? (
                kycDocuments.map((document) => (
                  <a
                    key={String(document._id ?? document.url)}
                    href={String(document.url)}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-md border border-secondary/50 px-2 py-1 text-xs font-semibold text-secondary"
                  >
                    {String(document.type)} document
                  </a>
                ))
              ) : (
                <span className="text-xs text-muted">
                  No KYC documents uploaded.
                </span>
              )}
            </div>
            {kycDocuments.length ? (
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => void updateKycStatus("VERIFIED")}
                  className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground"
                >
                  Verify KYC
                </button>
                <button
                  type="button"
                  onClick={() => void updateKycStatus("REJECTED")}
                  className="inline-flex h-8 items-center rounded-md border border-accent/50 px-3 text-xs font-semibold text-accent"
                >
                  Reject KYC
                </button>
              </div>
            ) : null}
          </section>
          <section className="rounded-md border border-border bg-background/45 p-4 text-sm">
            <h3 className="font-semibold">Bank & settlement details</h3>
            <dl className="mt-3 grid gap-2 text-muted">
              <div>
                Account holder: {String(bank.accountHolder ?? "Not provided")}
              </div>
              <div>Bank: {String(bank.bankName ?? "Not provided")}</div>
              <div>
                Account ending:{" "}
                {bank.accountNumberLast4
                  ? `•••• ${String(bank.accountNumberLast4)}`
                  : "Not provided"}
              </div>
              <div>IFSC: {String(bank.ifscCode ?? "Not provided")}</div>
              <div>Bank verified: {bank.verified ? "Yes" : "No"}</div>
            </dl>
          </section>
          <section className="rounded-md border border-border bg-background/45 p-4">
            <h3 className="font-semibold">Revenue performance</h3>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <MetricPill label="Events" value={events.length} />
              <MetricPill
                label="Tickets"
                value={Number(sales.ticketSales ?? 0)}
              />
              <MetricPill label="Revenue" value={Number(sales.revenue ?? 0)} />
              <MetricPill
                label="Platform commission"
                value={Number(sales.platformCommission ?? 0)}
              />
            </div>
          </section>
          <section className="rounded-md border border-border bg-background/45 p-4">
            <h3 className="font-semibold">Commission settings</h3>
            <div className="mt-3 flex items-end gap-2">
              <label className="grid flex-1 gap-1 text-xs text-muted">
                Platform commission %
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={commission}
                  onChange={(event) =>
                    setCommission(Number(event.target.value))
                  }
                  className="h-10 rounded-md border border-border bg-surface px-3 text-sm text-foreground"
                />
              </label>
              <button
                type="button"
                onClick={() => void saveCommission()}
                className="premium-button h-10 px-3 text-xs font-semibold"
              >
                Save
              </button>
            </div>
            <HistoryList
              title={`Settlement history (${payouts.length})`}
              items={payouts}
              describe={(payout) =>
                `INR ${String(payout.amount ?? 0)} · ${String(payout.status)}`
              }
            />
          </section>
          <HistoryList
            title={`Organizer events (${events.length})`}
            items={events}
            describe={(event) =>
              `${String(event.status)} · ${String(event.approvalStatus)}`
            }
          />
        </div>
      )}
    </section>
  );
}

function HistoryList({
  title,
  items,
  describe,
}: {
  title: string;
  items: AnyRecord[];
  describe: (item: AnyRecord) => string;
}) {
  return (
    <section className="rounded-md border border-border bg-background/45 p-4">
      <h3 className="font-semibold">{title}</h3>
      <div className="mt-3 grid max-h-64 gap-2 overflow-y-auto pr-1">
        {items.length ? (
          items.map((item) => (
            <div
              key={String(item._id)}
              className="flex items-center justify-between gap-3 border-b border-border pb-2 text-sm last:border-0 last:pb-0"
            >
              <span className="min-w-0 truncate">{describe(item)}</span>
              {item.createdAt ? (
                <span className="shrink-0 text-[11px] text-muted">
                  {new Date(String(item.createdAt)).toLocaleDateString("en-IN")}
                </span>
              ) : null}
            </div>
          ))
        ) : (
          <p className="text-sm text-muted">No records yet.</p>
        )}
      </div>
    </section>
  );
}

function OrganizerCard({
  mode,
  organizer,
  update,
  onView,
}: {
  mode: "approval" | "management";
  organizer: AnyRecord;
  update: (path: string, body: AnyRecord) => Promise<void>;
  onView: () => void;
}) {
  const user = organizer.user as AnyRecord | null;
  const status = String(organizer.verificationStatus);
  const updateStatus = (body: AnyRecord) =>
    update(`/api/admin/organizers/${String(organizer._id)}/status`, body);

  return (
    <article className="rounded-md border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium">{String(organizer.organizationName)}</p>
          <p className="text-xs text-muted">{String(user?.email ?? "")}</p>
        </div>
        <OrganizerStatusBadge status={status} />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onView}
          className="inline-flex h-9 items-center gap-1 rounded-md border border-secondary/50 px-3 text-xs font-semibold text-secondary"
        >
          <Eye className="size-3.5" /> Profile
        </button>
        {mode === "approval" ? (
          <>
            <button
              type="button"
              onClick={() =>
                void updateStatus({
                  status: "VERIFIED",
                  canCreateVenues: true,
                })
              }
              className="inline-flex h-9 items-center gap-1 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground"
            >
              <Check className="size-3.5" /> Approve
            </button>
            <button
              type="button"
              onClick={() => void updateStatus({ status: "REJECTED" })}
              className="inline-flex h-9 items-center gap-1 rounded-md border border-accent/50 px-3 text-xs font-semibold text-accent"
            >
              <X className="size-3.5" /> Reject
            </button>
          </>
        ) : status === "VERIFIED" ? (
          <button
            type="button"
            onClick={() => void updateStatus({ status: "SUSPENDED" })}
            className="inline-flex h-9 items-center gap-1 rounded-md border border-accent/50 px-3 text-xs font-semibold text-accent"
          >
            <X className="size-3.5" /> Suspend
          </button>
        ) : (
          <button
            type="button"
            onClick={() =>
              void updateStatus({
                status: "VERIFIED",
                canCreateVenues: true,
              })
            }
            className="inline-flex h-9 items-center gap-1 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground"
          >
            <Check className="size-3.5" /> Approve
          </button>
        )}
      </div>
    </article>
  );
}

function OrganizerStatusBadge({ status }: { status: string }) {
  const className =
    status === "VERIFIED"
      ? "bg-emerald-500/15 text-emerald-300"
      : status === "PENDING"
        ? "bg-warning/15 text-warning"
        : "bg-accent/15 text-accent";

  return (
    <span
      className={`rounded-sm px-2 py-1 text-[11px] font-semibold ${className}`}
    >
      {status}
    </span>
  );
}

function EventsView({
  data,
  update,
}: {
  data: AnyRecord;
  update: (path: string, body: AnyRecord) => Promise<void>;
}) {
  const events = (data.events as AnyRecord[] | undefined) ?? [];
  return (
    <div className="mt-7 grid gap-3">
      {events.map((event) => (
        <article
          key={String(event._id)}
          className="rounded-md border border-border bg-surface p-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-secondary">
                {String(event.eventType)}
              </p>
              <h2 className="mt-1 font-semibold">{String(event.title)}</h2>
              <p className="mt-1 text-sm text-muted">
                Status {String(event.status)} · Approval{" "}
                {String(event.approvalStatus)}
              </p>
            </div>
            <div className="flex gap-2">
              {event.approvalStatus === "PENDING" ? (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      void update(
                        `/api/admin/events/${String(event._id)}/status`,
                        { action: "APPROVE" },
                      )
                    }
                    className="grid size-9 place-items-center rounded-md bg-primary text-primary-foreground"
                    title="Approve"
                  >
                    <Check className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      void update(
                        `/api/admin/events/${String(event._id)}/status`,
                        { action: "REJECT" },
                      )
                    }
                    className="grid size-9 place-items-center rounded-md border border-accent/50 text-accent"
                    title="Reject"
                  >
                    <X className="size-4" />
                  </button>
                </>
              ) : null}
              {event.status !== "PUBLISHED" &&
              event.approvalStatus === "APPROVED" ? (
                <button
                  type="button"
                  onClick={() =>
                    void update(
                      `/api/admin/events/${String(event._id)}/status`,
                      { action: "PUBLISH" },
                    )
                  }
                  className="h-9 rounded-md border border-secondary/50 px-3 text-xs font-semibold text-secondary"
                >
                  Publish
                </button>
              ) : null}
            </div>
          </div>
          <details className="mt-4 rounded-md border border-border bg-background/45 p-3 text-sm">
            <summary className="cursor-pointer font-semibold text-secondary">
              Event information & moderation
            </summary>
            <div className="mt-3 grid gap-2 text-muted sm:grid-cols-2">
              <p>
                Organizer:{" "}
                {String(
                  (event.organizer as AnyRecord | null)?.organizationName ??
                    "-",
                )}
              </p>
              <p>
                Venue: {String((event.venue as AnyRecord | null)?.name ?? "-")}
              </p>
              <p>
                Category:{" "}
                {String((event.category as AnyRecord | null)?.name ?? "-")}
              </p>
              <p>
                Age restriction: {String(event.ageRestriction ?? "All ages")}
              </p>
              <p className="sm:col-span-2">
                {String(event.description ?? "No description")}
              </p>
            </div>
          </details>
          <EventModerationActions event={event} update={update} />
        </article>
      ))}
    </div>
  );
}

function EventModerationActions({
  event,
  update,
}: {
  event: AnyRecord;
  update: (path: string, body: AnyRecord) => Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const [publishAt, setPublishAt] = useState("");
  const path = `/api/admin/events/${String(event._id)}/status`;
  const action = (name: string, extra: AnyRecord = {}) =>
    update(path, { action: name, ...extra });

  return (
    <div className="mt-4 space-y-3 border-t border-border pt-4">
      <div className="flex flex-wrap gap-2">
        <input
          value={reason}
          onChange={(input) => setReason(input.target.value)}
          placeholder="Rejection or change-request reason"
          className="h-9 min-w-56 flex-1 rounded-md border border-border bg-background px-3 text-xs"
        />
        <button
          type="button"
          onClick={() => void action("REQUEST_CHANGES", { reason })}
          className="h-9 rounded-md border border-warning/50 px-3 text-xs font-semibold text-warning"
        >
          Request changes
        </button>
        <button
          type="button"
          onClick={() => void action("DUPLICATE")}
          className="h-9 rounded-md border border-border px-3 text-xs font-semibold"
        >
          Duplicate
        </button>
        <button
          type="button"
          onClick={() => void action("ARCHIVE")}
          className="h-9 rounded-md border border-border px-3 text-xs font-semibold"
        >
          Archive
        </button>
        {event.status === "PUBLISHED" ? (
          <>
            <button
              type="button"
              onClick={() => void action("UNPUBLISH")}
              className="h-9 rounded-md border border-border px-3 text-xs font-semibold"
            >
              Unpublish
            </button>
            <button
              type="button"
              onClick={() => void action("CANCEL")}
              className="h-9 rounded-md border border-accent/50 px-3 text-xs font-semibold text-accent"
            >
              Cancel event
            </button>
          </>
        ) : null}
      </div>
      {event.approvalStatus === "APPROVED" && event.status !== "PUBLISHED" ? (
        <div className="flex flex-wrap items-end gap-2">
          <label className="grid gap-1 text-xs text-muted">
            Schedule publishing
            <input
              type="datetime-local"
              value={publishAt}
              onChange={(input) => setPublishAt(input.target.value)}
              className="h-9 rounded-md border border-border bg-background px-2 text-xs text-foreground"
            />
          </label>
          <button
            type="button"
            disabled={!publishAt}
            onClick={() =>
              void action("SCHEDULE_PUBLISH", { scheduledPublishAt: publishAt })
            }
            className="h-9 rounded-md border border-secondary/50 px-3 text-xs font-semibold text-secondary disabled:opacity-50"
          >
            Schedule
          </button>
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {(["FEATURE", "TRENDING", "RECOMMENDED"] as const).map((flag) => {
          const enabled = Boolean(event[flag.toLowerCase()]);
          return (
            <button
              key={flag}
              type="button"
              onClick={() => void action(flag, { enabled: !enabled })}
              className={`h-8 rounded-md border px-3 text-xs font-semibold ${enabled ? "border-secondary/60 text-secondary" : "border-border text-muted"}`}
            >
              {enabled ? "Remove " : "Mark "}
              {flag.toLowerCase()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ReviewsView({
  data,
  update,
}: {
  data: AnyRecord;
  update: (path: string, body: AnyRecord) => Promise<void>;
}) {
  const reviews = (data.reviews as AnyRecord[] | undefined) ?? [];
  return (
    <div className="mt-7 grid gap-3">
      {reviews.map((review) => (
        <article
          key={String(review._id)}
          className="rounded-md border border-border bg-surface p-4"
        >
          <div className="flex justify-between gap-3">
            <p className="font-semibold">
              {String(review.rating)}/5 ·{" "}
              {String((review.user as AnyRecord | null)?.name ?? "Customer")}
            </p>
            <span className="text-xs text-muted">{String(review.status)}</span>
          </div>
          <p className="mt-2 text-sm text-muted">
            {String(review.comment ?? "No comment")}
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() =>
                void update(`/api/admin/reviews/${String(review._id)}/status`, {
                  status: "APPROVED",
                })
              }
              className="inline-flex h-8 items-center gap-1 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground"
            >
              <Check className="size-3.5" /> Approve
            </button>
            <button
              type="button"
              onClick={() =>
                void update(`/api/admin/reviews/${String(review._id)}/status`, {
                  status: "REJECTED",
                })
              }
              className="inline-flex h-8 items-center gap-1 rounded-md border border-accent/50 px-3 text-xs font-semibold text-accent"
            >
              <X className="size-3.5" /> Reject
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
function AuditView({ data }: { data: AnyRecord }) {
  const logs = (data.logs as AnyRecord[] | undefined) ?? [];
  return (
    <div className="mt-7 overflow-x-auto rounded-md border border-border bg-surface">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="border-b border-border text-xs uppercase tracking-[0.12em] text-muted">
          <tr>
            <th className="px-4 py-3">Action</th>
            <th className="px-4 py-3">Resource</th>
            <th className="px-4 py-3">Actor</th>
            <th className="px-4 py-3">Time</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr
              key={String(log._id)}
              className="border-b border-border last:border-0"
            >
              <td className="px-4 py-3 font-medium">{String(log.action)}</td>
              <td className="px-4 py-3 text-muted">
                {String(log.resourceType)} / {String(log.resourceId ?? "-")}
              </td>
              <td className="px-4 py-3 text-muted">
                {String(
                  (log.actor as AnyRecord | null)?.email ?? log.actorRole,
                )}
              </td>
              <td className="px-4 py-3 text-muted">
                {new Date(String(log.createdAt)).toLocaleString("en-IN")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function BookingsView({ data }: { data: AnyRecord }) {
  const bookings = (data.bookings as AnyRecord[] | undefined) ?? [];
  const payments = (data.payments as AnyRecord[] | undefined) ?? [];
  const paymentByBookingId = new Map(
    payments.map((payment) => {
      const booking = payment.booking as AnyRecord | string | null;
      return [
        String(
          typeof booking === "object" && booking !== null
            ? booking._id
            : (booking ?? ""),
        ),
        payment,
      ];
    }),
  );
  const money = (value: unknown, currency = "INR") =>
    `${currency === "INR" ? "₹" : `${currency} `}${Number(value ?? 0).toLocaleString("en-IN")}`;
  const dateTime = (value: unknown) =>
    value ? new Date(String(value)).toLocaleString("en-IN") : "Not scheduled";
  const operationalStatus = (booking: AnyRecord, payment?: AnyRecord) => {
    const ticket = booking.ticket as AnyRecord | null;
    if (ticket?.checkedIn) return "CHECKED-IN";
    if (booking.status === "REFUNDED") return "REFUNDED";
    if (booking.status === "REFUND_PENDING") return "PARTIALLY REFUNDED";
    if (payment?.status === "FAILED") return "FAILED";
    if (["CREATED", "PENDING"].includes(String(payment?.status)))
      return "PAYMENT PROCESSING";
    return String(booking.status ?? "PENDING");
  };

  return (
    <div className="mt-7 space-y-8">
      <section>
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">Bookings</h2>
            <p className="text-sm text-muted">
              Complete customer, ticket, show, and payment breakdowns.
            </p>
          </div>
          <span className="text-sm text-muted">
            {bookings.length} recent records
          </span>
        </div>
        <div className="mt-4 grid gap-4">
          {bookings.length ? (
            bookings.map((booking) => {
              const user = booking.user as AnyRecord | null;
              const show = booking.show as AnyRecord | null;
              const pricing = booking.pricing as AnyRecord | null;
              const seats = (booking.seats as AnyRecord[] | undefined) ?? [];
              const payment = paymentByBookingId.get(String(booking._id));
              const event = show?.event as AnyRecord | null;
              const movie = show?.movie as AnyRecord | null;
              const venue = show?.venue as AnyRecord | null;
              const cinema = show?.cinema as AnyRecord | null;
              const ticket = booking.ticket as AnyRecord | null;
              const status = operationalStatus(booking, payment);
              const currency = String(pricing?.currency ?? "INR");
              return (
                <article
                  key={String(booking._id)}
                  className="rounded-lg border border-border bg-surface p-5 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                        Booking ID · {String(booking._id)}
                      </p>
                      <h3 className="mt-1 font-semibold">
                        {String(
                          event?.title ?? movie?.title ?? "Scheduled content",
                        )}
                      </h3>
                      <p className="mt-1 text-sm text-muted">
                        {String(venue?.name ?? cinema?.name ?? "Venue pending")}{" "}
                        · {dateTime(show?.startTime)}
                      </p>
                    </div>
                    <span className="rounded-full border border-secondary/40 bg-secondary/10 px-3 py-1 text-xs font-semibold text-secondary">
                      {status}
                    </span>
                  </div>
                  <div className="grid gap-5 pt-4 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="space-y-1 text-sm">
                      <p className="font-semibold">Customer</p>
                      <p>{String(user?.name ?? "Customer")}</p>
                      <p className="text-muted">
                        {String(user?.email ?? "Email unavailable")}
                      </p>
                      <p className="text-muted">
                        {String(user?.phone ?? "Mobile unavailable")}
                      </p>
                    </div>
                    <div className="space-y-1 text-sm">
                      <p className="font-semibold">Tickets</p>
                      <p>
                        {seats.length} ticket{seats.length === 1 ? "" : "s"} ·{" "}
                        {seats.map((seat) => String(seat.seatId)).join(", ") ||
                          "Seat pending"}
                      </p>
                      <p className="text-muted">
                        {seats
                          .map(
                            (seat) =>
                              `${String(seat.category)} (${money(seat.price, currency)})`,
                          )
                          .join(" · ")}
                      </p>
                      <p className="text-muted">
                        {ticket
                          ? `Ticket ${String(ticket.ticketId)}${ticket.checkedInAt ? ` · checked in ${dateTime(ticket.checkedInAt)}` : ""}`
                          : "Ticket not issued"}
                      </p>
                    </div>
                    <div className="space-y-1 text-sm">
                      <p className="font-semibold">Price breakdown</p>
                      <p className="text-muted">
                        Tickets {money(pricing?.basePrice, currency)}
                      </p>
                      <p className="text-muted">
                        Tax {money(pricing?.tax, currency)} · Fee{" "}
                        {money(pricing?.convenienceFee, currency)}
                      </p>
                      <p className="text-muted">
                        Discount −{money(pricing?.discount, currency)}
                      </p>
                      <p className="font-semibold">
                        Paid {money(pricing?.total, currency)}
                      </p>
                    </div>
                    <div className="space-y-1 text-sm">
                      <p className="font-semibold">Payment</p>
                      <p>{String(payment?.status ?? "NOT STARTED")}</p>
                      <p className="text-muted">
                        {String(
                          payment?.paymentMethod ?? "Method awaiting gateway",
                        )}
                      </p>
                      <p className="text-muted">
                        Created {dateTime(booking.createdAt)}
                      </p>
                      <p className="text-muted">
                        Show {String(show?.bookingStatus ?? "Not scheduled")}
                      </p>
                    </div>
                  </div>
                </article>
              );
            })
          ) : (
            <p className="rounded-md border border-dashed border-border p-5 text-sm text-muted">
              No bookings have been created yet.
            </p>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Transactions</h2>
        <p className="mt-1 text-sm text-muted">
          Gateway-confirmed transaction history. Booking confirmation is driven
          only by the verified Razorpay webhook.
        </p>
        <div className="mt-4 overflow-x-auto rounded-lg border border-border">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-border bg-surface text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Transaction</th>
                <th className="px-4 py-3 font-medium">Gateway IDs</th>
                <th className="px-4 py-3 font-medium">Method / status</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Gateway response</th>
                <th className="px-4 py-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {payments.length ? (
                payments.map((payment) => {
                  const response = payment.gatewayResponse as AnyRecord | null;
                  return (
                    <tr
                      key={String(payment._id)}
                      className="border-b border-border last:border-0"
                    >
                      <td className="px-4 py-3 font-medium">
                        {String(payment._id)}
                      </td>
                      <td className="px-4 py-3 text-muted">
                        <p>
                          {String(
                            payment.gatewayPaymentId ?? "Payment ID pending",
                          )}
                        </p>
                        <p className="mt-1 text-xs">
                          Order {String(payment.gatewayOrderId ?? "-")}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p>
                          {String(payment.paymentMethod ?? "Awaiting gateway")}
                        </p>
                        <p className="mt-1 text-xs text-muted">
                          {String(payment.status ?? "CREATED")}
                        </p>
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {money(
                          payment.amount,
                          String(payment.currency ?? "INR"),
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted">
                        <p>
                          {String(response?.event ?? "No webhook response yet")}
                        </p>
                        {response?.errorDescription ? (
                          <p className="mt-1 text-xs">
                            {String(response.errorDescription)}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-muted">
                        {dateTime(
                          payment.paidAt ??
                            payment.failedAt ??
                            payment.createdAt,
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-5 text-muted">
                    No payment transactions yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
function WorkspaceView({ section }: { section: Section }) {
  if (section === "marketing") return <CouponManager />;
  return (
    <div className="mt-7 rounded-md border border-dashed border-border bg-surface p-6">
      <p className="font-semibold">
        {section === "management"
          ? "Core catalog management"
          : "Marketing operations"}
      </p>
      <p className="mt-2 text-sm leading-6 text-muted">
        Use the existing management tools for venues, cinemas, screens, and
        shows. This workspace is ready for the next collection-specific editor
        while the shared role gate and audit trail are already active.
      </p>
    </div>
  );
}

function AdminSettings({
  request,
}: {
  request: (path: string, init?: RequestInit) => Promise<AnyRecord>;
}) {
  const [policy, setPolicy] = useState({
    fullRefundHours: 24,
    partialRefundHours: 2,
    partialRefundPercent: 50,
  });
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    const timer = window.setTimeout(
      () =>
        void request("/api/admin/settings/cancellation-policy")
          .then((result) => {
            if (result.policy) setPolicy(result.policy as typeof policy);
          })
          .catch((loadError) =>
            setError(
              loadError instanceof Error
                ? loadError.message
                : "Unable to load settings.",
            ),
          ),
      0,
    );
    return () => window.clearTimeout(timer);
  }, [request]);
  const savePolicy = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await request("/api/admin/settings/cancellation-policy", {
        method: "PATCH",
        body: JSON.stringify(policy),
      });
      setMessage("Cancellation policy updated.");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save settings.",
      );
    }
  };
  const changePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    const user = firebaseAuth.currentUser;
    if (!user || password.length < 6)
      return setError("Enter a password with at least 6 characters.");
    try {
      await updatePassword(user, password);
      setPassword("");
      setMessage("Admin password updated in Firebase Authentication.");
    } catch (passwordError) {
      setError(
        passwordError instanceof Error
          ? passwordError.message
          : "Recent authentication may be required.",
      );
    }
  };
  return (
    <main className="min-h-screen bg-background px-5 py-8 text-foreground sm:px-8">
      <div className="mx-auto max-w-3xl">
        <p className="text-sm font-semibold text-secondary">Admin settings</p>
        <h1 className="mt-2 text-3xl font-semibold">Platform rules</h1>
        {message ? (
          <p className="mt-5 rounded-md border border-secondary/40 bg-secondary/10 p-3 text-sm">
            {message}
          </p>
        ) : null}
        {error ? (
          <p className="mt-5 rounded-md border border-accent/50 bg-accent/10 p-3 text-sm">
            {error}
          </p>
        ) : null}
        <form
          onSubmit={savePolicy}
          className="mt-7 grid gap-4 rounded-md border border-border bg-surface p-5"
        >
          <h2 className="font-semibold">Cancellation policy</h2>
          <p className="text-sm text-muted">
            These values feed every customer refund calculation.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="grid gap-1 text-sm">
              Full refund hours
              <input
                type="number"
                min="0"
                value={policy.fullRefundHours}
                onChange={(event) =>
                  setPolicy({
                    ...policy,
                    fullRefundHours: Number(event.target.value),
                  })
                }
                className="h-10 rounded-md border border-border bg-background px-3"
              />
            </label>
            <label className="grid gap-1 text-sm">
              Partial refund hours
              <input
                type="number"
                min="0"
                value={policy.partialRefundHours}
                onChange={(event) =>
                  setPolicy({
                    ...policy,
                    partialRefundHours: Number(event.target.value),
                  })
                }
                className="h-10 rounded-md border border-border bg-background px-3"
              />
            </label>
            <label className="grid gap-1 text-sm">
              Partial refund %
              <input
                type="number"
                min="0"
                max="100"
                value={policy.partialRefundPercent}
                onChange={(event) =>
                  setPolicy({
                    ...policy,
                    partialRefundPercent: Number(event.target.value),
                  })
                }
                className="h-10 rounded-md border border-border bg-background px-3"
              />
            </label>
          </div>
          <button className="inline-flex h-10 w-fit items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground">
            <Save className="size-4" /> Save policy
          </button>
        </form>
        <form
          onSubmit={changePassword}
          className="mt-6 grid gap-4 rounded-md border border-border bg-surface p-5"
        >
          <h2 className="font-semibold">Admin password</h2>
          <p className="text-sm text-muted">
            Updates the signed-in Admin Firebase password.
          </p>
          <input
            type="password"
            minLength={6}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="New password"
            className="h-10 rounded-md border border-border bg-background px-3"
          />
          <button className="inline-flex h-10 w-fit items-center gap-2 rounded-md border border-secondary/50 px-4 text-sm font-semibold text-secondary">
            <ShieldCheck className="size-4" /> Change password
          </button>
        </form>
      </div>
    </main>
  );
}
