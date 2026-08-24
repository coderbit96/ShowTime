"use client";

import {
  Check,
  LoaderCircle,
  Save,
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
          <UsersView data={data} update={update} />
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
}: {
  data: AnyRecord;
  update: (path: string, body: AnyRecord) => Promise<void>;
}) {
  const users = (data.users as AnyRecord[] | undefined) ?? [];
  const organizers = (data.organizers as AnyRecord[] | undefined) ?? [];
  return (
    <div className="mt-7 grid gap-8 xl:grid-cols-2">
      <section>
        <h2 className="text-lg font-semibold">Customers</h2>
        <div className="mt-4 grid gap-3">
          {users
            .filter((user) => user.role === "CUSTOMER")
            .map((user) => (
              <article
                key={String(user._id)}
                className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface p-4"
              >
                <div>
                  <p className="font-medium">{String(user.name)}</p>
                  <p className="text-xs text-muted">{String(user.email)}</p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    void update(`/api/admin/users/${String(user._id)}/status`, {
                      active: !user.active,
                    })
                  }
                  className="inline-flex h-9 items-center gap-1 rounded-md border border-border px-3 text-xs font-semibold"
                >
                  <UserCheck className="size-3.5" />
                  {user.active ? "Deactivate" : "Activate"}
                </button>
              </article>
            ))}
        </div>
      </section>
      <section>
        <h2 className="text-lg font-semibold">Organizer approvals</h2>
        <div className="mt-4 grid gap-3">
          {organizers.map((organizer) => {
            const user = organizer.user as AnyRecord | null;
            return (
              <article
                key={String(organizer._id)}
                className="rounded-md border border-border bg-surface p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">
                      {String(organizer.organizationName)}
                    </p>
                    <p className="text-xs text-muted">
                      {String(user?.email ?? "")}
                    </p>
                  </div>
                  <span className="rounded-sm bg-warning/15 px-2 py-1 text-[11px] font-semibold text-warning">
                    {String(organizer.verificationStatus)}
                  </span>
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      void update(
                        `/api/admin/organizers/${String(organizer._id)}/status`,
                        { status: "VERIFIED", canCreateVenues: true },
                      )
                    }
                    className="inline-flex h-9 items-center gap-1 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground"
                  >
                    <Check className="size-3.5" /> Approve
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      void update(
                        `/api/admin/organizers/${String(organizer._id)}/status`,
                        { status: "REJECTED" },
                      )
                    }
                    className="inline-flex h-9 items-center gap-1 rounded-md border border-accent/50 px-3 text-xs font-semibold text-accent"
                  >
                    <X className="size-3.5" /> Reject
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
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
              {event.status === "DRAFT" &&
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
        </article>
      ))}
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
  return (
    <div className="mt-7 grid gap-3">
      {bookings.map((booking) => (
        <article
          key={String(booking._id)}
          className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-surface p-4"
        >
          <div>
            <p className="font-medium">
              {String((booking.user as AnyRecord | null)?.name ?? "Customer")}
            </p>
            <p className="text-sm text-muted">
              INR {String((booking.pricing as AnyRecord | null)?.total ?? 0)} ·{" "}
              {String(booking.status)}
            </p>
          </div>
          <span className="text-xs text-muted">
            {new Date(String(booking.createdAt)).toLocaleString("en-IN")}
          </span>
        </article>
      ))}
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
