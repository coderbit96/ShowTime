"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { LoaderCircle, Plus, UsersRound } from "lucide-react";
import { firebaseAuth } from "@/lib/firebase/client";

type GroupBooking = {
  _id: string;
  name: string;
  status: string;
  paymentMode: "PAY_TOGETHER" | "SPLIT";
  show?: string;
  selectedSeats: string[];
  members: Array<{ email?: string; status: string; assignedSeats: string[] }>;
  createdAt: string;
};

export function GroupBookingPanel() {
  const [groups, setGroups] = useState<GroupBooking[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const request = useCallback(async (init: RequestInit = {}) => {
    const token = await firebaseAuth.currentUser?.getIdToken();
    if (!token) throw new Error("Sign in to manage group bookings.");
    const response = await fetch("/api/groups", {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...init.headers,
      },
    });
    const payload = (await response.json()) as {
      groups?: GroupBooking[];
      group?: GroupBooking;
      error?: string;
    };
    if (!response.ok) throw new Error(payload.error ?? "Request failed.");
    return payload;
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setGroups((await request()).groups ?? []);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load group bookings.",
      );
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const create = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreating(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const invitees = String(form.get("invitees") ?? "")
      .split(",")
      .map((email) => email.trim())
      .filter(Boolean);
    try {
      await request({
        method: "POST",
        body: JSON.stringify({
          name: form.get("name"),
          paymentMode: form.get("paymentMode"),
          invitees,
          idempotencyKey:
            typeof crypto.randomUUID === "function"
              ? crypto.randomUUID()
              : `${Date.now()}-${Math.random()}`,
        }),
      });
      event.currentTarget.reset();
      await load();
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Unable to create group booking.",
      );
    } finally {
      setCreating(false);
    }
  };

  return (
    <main className="min-h-screen bg-background px-5 py-8 text-foreground sm:px-6">
      <div className="mx-auto max-w-6xl">
        <p className="inline-flex items-center gap-2 text-sm font-semibold text-secondary">
          <UsersRound className="size-4" aria-hidden="true" />
          Group booking
        </p>
        <h1 className="mt-2 text-3xl font-semibold">
          Book seats together, pay your way
        </h1>
        <div className="mt-7 grid gap-7 lg:grid-cols-[360px_minmax(0,1fr)]">
          <form
            onSubmit={create}
            className="grid h-fit gap-3 rounded-md border border-border bg-surface p-5"
          >
            <h2 className="font-semibold">Create group</h2>
            <input
              name="name"
              required
              placeholder="Friday movie plan"
              className="h-10 rounded-md border border-border bg-background px-3 text-sm"
            />
            <select
              name="paymentMode"
              className="h-10 rounded-md border border-border bg-background px-3 text-sm"
            >
              <option value="PAY_TOGETHER">Pay together</option>
              <option value="SPLIT">Split payment</option>
            </select>
            <textarea
              name="invitees"
              rows={4}
              placeholder="friend@example.com, another@example.com"
              className="rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={creating}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-cta px-4 text-sm font-semibold text-cta-foreground disabled:opacity-50"
            >
              {creating ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
              Create group
            </button>
            <p className="text-xs leading-5 text-muted">
              Choose a movie or event after creating the group. Seat locking,
              checkout and Razorpay orders stay on the same secure booking path.
            </p>
          </form>

          <section>
            {error ? (
              <p className="mb-4 rounded-md border border-accent/50 bg-accent/10 p-3 text-sm">
                {error}
              </p>
            ) : null}
            {loading ? (
              <div className="grid min-h-52 place-items-center rounded-md border border-border bg-surface">
                <LoaderCircle className="size-5 animate-spin text-secondary" />
              </div>
            ) : groups.length ? (
              <div className="grid gap-3">
                {groups.map((group) => (
                  <article
                    key={group._id}
                    className="rounded-md border border-border bg-surface p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h2 className="font-semibold">{group.name}</h2>
                        <p className="mt-1 text-sm text-muted">
                          {group.paymentMode.replace("_", " ").toLowerCase()} -{" "}
                          {group.status.replaceAll("_", " ").toLowerCase()}
                        </p>
                      </div>
                      <Link
                        href={
                          group.show
                            ? `/booking?showId=${group.show}&groupId=${group._id}`
                            : `/search?groupId=${group._id}`
                        }
                        className="inline-flex h-9 items-center justify-center rounded-md border border-border px-3 text-sm font-semibold text-muted hover:bg-surface-muted hover:text-foreground"
                      >
                        Continue
                      </Link>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted">
                      <span>{group.members.length} invitees</span>
                      <span>{group.selectedSeats.length} seats selected</span>
                      <span>
                        Created{" "}
                        {new Date(group.createdAt).toLocaleDateString("en-IN")}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="rounded-md border border-border bg-surface p-6 text-sm text-muted">
                No group bookings yet.
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
