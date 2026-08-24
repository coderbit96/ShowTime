"use client";

import Link from "next/link";
import {
  BadgePercent,
  EyeOff,
  Gift,
  Heart,
  LoaderCircle,
  Ticket,
  WalletCards,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { firebaseAuth } from "@/lib/firebase/client";

type Profile = { name: string; email: string; phone?: string; avatar?: string };
type Booking = {
  id: string;
  status: string;
  seats: string[];
  total: number;
  startTime?: string;
  title: string;
  venue: string;
  ticketId?: string;
  contentType?: "MOVIE" | "EVENT";
  cinemaId?: string;
  reviewTarget?: { type: "event" | "movie" | "venue"; id: string } | null;
  refund?: {
    status: string;
    requestedAmount: number;
    approvedAmount?: number;
  } | null;
};
type WalletState = {
  wallet?: { balance: number; rewardPoints: number; currency: string };
  transactions?: Array<{
    _id: string;
    type: string;
    source: string;
    amount: number;
    points: number;
    createdAt: string;
  }>;
};
type ReferralState = {
  referral?: { code: string; rewardPoints: number; status: string };
};
type MembershipState = {
  plans?: Array<{
    _id: string;
    name: string;
    price: number;
    durationDays: number;
    benefits?: {
      rewardMultiplier?: number;
      bookingDiscountPercent?: number;
      foodDiscountPercent?: number;
    };
  }>;
  activeSubscription?: {
    endsAt: string;
    plan?: { name: string };
  } | null;
};
type WalletPass = {
  _id: string;
  passId: string;
  title: string;
  status: string;
  expiresAt: string;
};

async function authorizedFetch(path: string, options: RequestInit = {}) {
  const token = await firebaseAuth.currentUser?.getIdToken();
  if (!token) throw new Error("Sign in to manage your account.");
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
  const payload = (await response.json()) as {
    error?: string;
    [key: string]: unknown;
  };
  if (!response.ok) throw new Error(payload.error ?? "Request failed.");
  return payload;
}

export function AccountPanel() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [favorites, setFavorites] = useState<unknown[]>([]);
  const [wallet, setWallet] = useState<WalletState | null>(null);
  const [referral, setReferral] = useState<ReferralState | null>(null);
  const [memberships, setMemberships] = useState<MembershipState | null>(null);
  const [passes, setPasses] = useState<WalletPass[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [reviewDrafts, setReviewDrafts] = useState<
    Record<string, { rating: string; comment: string }>
  >({});

  const load = async () => {
    setLoading(true);
    try {
      const [
        profileResult,
        bookingResult,
        favoriteResult,
        walletResult,
        referralResult,
        membershipResult,
        passResult,
      ] = await Promise.all([
        authorizedFetch("/api/account/profile"),
        authorizedFetch("/api/account/bookings"),
        authorizedFetch("/api/account/favorites"),
        authorizedFetch("/api/account/wallet"),
        authorizedFetch("/api/referrals"),
        authorizedFetch("/api/memberships"),
        authorizedFetch("/api/account/wallet-passes"),
      ]);
      setProfile((profileResult.profile as Profile) ?? null);
      setBookings((bookingResult.bookings as Booking[]) ?? []);
      setFavorites((favoriteResult.favorites as unknown[]) ?? []);
      setWallet(walletResult as WalletState);
      setReferral(referralResult as ReferralState);
      setMemberships(membershipResult as MembershipState);
      setPasses((passResult.passes as WalletPass[]) ?? []);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to load account.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = firebaseAuth.onAuthStateChanged(() => void load());
    return unsubscribe;
  }, []);

  const saveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!profile) return;
    try {
      const result = await authorizedFetch("/api/account/profile", {
        method: "PATCH",
        body: JSON.stringify({
          name: profile.name,
          phone: profile.phone ?? "",
          avatar: profile.avatar ?? "",
        }),
      });
      setProfile(result.profile as Profile);
      setMessage("Profile updated.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to update profile.",
      );
    }
  };

  const cancel = async (bookingId: string, manualReview = false) => {
    try {
      await authorizedFetch("/api/refunds/request", {
        method: "POST",
        body: JSON.stringify({
          bookingId,
          idempotencyKey: crypto.randomUUID(),
          manualReview,
        }),
      });
      setMessage(
        manualReview
          ? "Refund exception requested. An admin will review it."
          : "Cancellation requested. An admin will review the refund.",
      );
      await load();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to request cancellation.",
      );
    }
  };

  const hide = async (bookingId: string) => {
    try {
      await authorizedFetch(`/api/account/bookings/${bookingId}/hide`, {
        method: "POST",
      });
      setBookings((current) =>
        current.filter((booking) => booking.id !== bookingId),
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to hide booking.",
      );
    }
  };

  const submitReview = async (booking: Booking) => {
    const target = booking.reviewTarget;
    if (!target) return;
    const draft = reviewDrafts[booking.id] ?? { rating: "5", comment: "" };
    try {
      await authorizedFetch("/api/account/reviews", {
        method: "POST",
        body: JSON.stringify({
          type: target.type,
          id: target.id,
          rating: Number(draft.rating),
          comment: draft.comment,
        }),
      });
      setMessage("Thanks. Your review is awaiting moderation.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to save review.",
      );
    }
  };

  const redeemPoints = async () => {
    try {
      const result = await authorizedFetch("/api/account/wallet", {
        method: "POST",
        body: JSON.stringify({
          points: 100,
          idempotencyKey: crypto.randomUUID(),
        }),
      });
      setWallet(result as WalletState);
      setMessage("100 points converted to wallet balance.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to redeem points.",
      );
    }
  };

  const redeemReferral = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await authorizedFetch("/api/referrals", {
        method: "POST",
        body: JSON.stringify({
          code: form.get("code"),
          idempotencyKey: crypto.randomUUID(),
        }),
      });
      setMessage("Referral redeemed. Rewards were added.");
      await load();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to redeem referral.",
      );
    }
  };

  const subscribe = async (planId: string) => {
    try {
      await authorizedFetch("/api/memberships", {
        method: "POST",
        body: JSON.stringify({
          planId,
          idempotencyKey: crypto.randomUUID(),
        }),
      });
      setMessage("Membership activated and wallet pass issued.");
      await load();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to activate membership.",
      );
    }
  };

  if (loading)
    return (
      <div className="grid min-h-80 place-items-center">
        <LoaderCircle className="size-5 animate-spin" />
      </div>
    );
  if (!profile)
    return (
      <p className="rounded-md border border-accent/50 bg-accent/10 p-5 text-sm">
        {message || "Sign in to view your account."}
      </p>
    );

  return (
    <div className="grid gap-8 lg:grid-cols-[18rem_minmax(0,1fr)]">
      <aside className="h-fit border-b border-border pb-6 lg:border-b-0 lg:border-r lg:pr-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-secondary">
          Account
        </p>
        <h1 className="mt-2 text-2xl font-semibold">{profile.name}</h1>
        <p className="mt-1 text-sm text-muted">{profile.email}</p>
        <div className="mt-6 flex items-center gap-2 text-sm text-muted">
          <Ticket className="size-4 text-secondary" /> {bookings.length} visible
          bookings
        </div>
        <div className="mt-3 flex items-center gap-2 text-sm text-muted">
          <Heart className="size-4 text-accent" /> {favorites.length} favorites
        </div>
        <div className="mt-3 flex items-center gap-2 text-sm text-muted">
          <WalletCards className="size-4 text-secondary" /> INR{" "}
          {wallet?.wallet?.balance ?? 0} wallet
        </div>
        <div className="mt-3 flex items-center gap-2 text-sm text-muted">
          <Gift className="size-4 text-warning" />{" "}
          {wallet?.wallet?.rewardPoints ?? 0} points
        </div>
      </aside>
      <div className="space-y-8">
        {message ? (
          <p className="rounded-md border border-secondary/40 bg-secondary/10 px-4 py-3 text-sm text-foreground">
            {message}
          </p>
        ) : null}
        <section>
          <h2 className="text-lg font-semibold">Profile</h2>
          <form
            onSubmit={saveProfile}
            className="mt-4 grid gap-3 rounded-md border border-border bg-surface p-4 sm:grid-cols-2"
          >
            <label className="grid gap-1 text-sm">
              Name
              <input
                value={profile.name}
                onChange={(event) =>
                  setProfile({ ...profile, name: event.target.value })
                }
                className="h-10 rounded-md border border-border bg-background px-3"
              />
            </label>
            <label className="grid gap-1 text-sm">
              Phone
              <input
                value={profile.phone ?? ""}
                onChange={(event) =>
                  setProfile({ ...profile, phone: event.target.value })
                }
                className="h-10 rounded-md border border-border bg-background px-3"
              />
            </label>
            <label className="grid gap-1 text-sm sm:col-span-2">
              Avatar URL
              <input
                value={profile.avatar ?? ""}
                onChange={(event) =>
                  setProfile({ ...profile, avatar: event.target.value })
                }
                className="h-10 rounded-md border border-border bg-background px-3"
              />
            </label>
            <button className="h-10 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground sm:w-fit">
              Save profile
            </button>
          </form>
        </section>
        <section className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-md border border-border bg-surface p-4">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <WalletCards className="size-4 text-secondary" /> Wallet
            </p>
            <p className="mt-3 text-2xl font-semibold">
              INR {wallet?.wallet?.balance ?? 0}
            </p>
            <p className="mt-1 text-sm text-muted">
              {wallet?.wallet?.rewardPoints ?? 0} reward points
            </p>
            <button
              type="button"
              onClick={() => void redeemPoints()}
              className="mt-4 h-9 rounded-md border border-border px-3 text-xs font-semibold text-muted hover:bg-surface-muted"
            >
              Redeem 100 points
            </button>
          </div>
          <div className="rounded-md border border-border bg-surface p-4">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Gift className="size-4 text-warning" /> Referrals
            </p>
            <p className="mt-3 font-mono text-lg font-semibold">
              {referral?.referral?.code ?? "Loading"}
            </p>
            <p className="mt-1 text-xs text-muted">
              Share your code. Rewards land in wallet points after redemption.
            </p>
            <form onSubmit={redeemReferral} className="mt-4 flex gap-2">
              <input
                name="code"
                placeholder="Enter code"
                className="h-9 min-w-0 flex-1 rounded-md border border-border bg-background px-3 text-xs uppercase"
              />
              <button className="h-9 rounded-md border border-border px-3 text-xs font-semibold text-muted">
                Redeem
              </button>
            </form>
          </div>
          <div className="rounded-md border border-border bg-surface p-4">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <BadgePercent className="size-4 text-accent" /> Membership
            </p>
            <p className="mt-3 text-sm font-semibold">
              {memberships?.activeSubscription?.plan?.name ?? "No active plan"}
            </p>
            <p className="mt-1 text-xs text-muted">
              {memberships?.activeSubscription
                ? `Valid until ${new Date(
                    memberships.activeSubscription.endsAt,
                  ).toLocaleDateString("en-IN")}`
                : "Subscribe with wallet balance."}
            </p>
            <div className="mt-4 grid gap-2">
              {(memberships?.plans ?? []).slice(0, 2).map((plan) => (
                <button
                  key={plan._id}
                  type="button"
                  onClick={() => void subscribe(plan._id)}
                  className="flex min-h-10 items-center justify-between rounded-md border border-border px-3 text-left text-xs hover:bg-surface-muted"
                >
                  <span>{plan.name}</span>
                  <span>INR {plan.price}</span>
                </button>
              ))}
            </div>
          </div>
        </section>
        <section>
          <h2 className="text-lg font-semibold">Wallet passes</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {passes.length ? (
              passes.map((pass) => (
                <article
                  key={pass._id}
                  className="rounded-md border border-border bg-surface p-4"
                >
                  <p className="font-semibold">{pass.title}</p>
                  <p className="mt-1 font-mono text-xs text-secondary">
                    {pass.passId}
                  </p>
                  <p className="mt-2 text-xs text-muted">
                    {pass.status} - expires{" "}
                    {new Date(pass.expiresAt).toLocaleDateString("en-IN")}
                  </p>
                </article>
              ))
            ) : (
              <p className="rounded-md border border-dashed border-border p-5 text-sm text-muted sm:col-span-2">
                No wallet passes yet.
              </p>
            )}
          </div>
        </section>
        <section>
          <h2 className="text-lg font-semibold">Booking history</h2>
          <div className="mt-4 grid gap-3">
            {!bookings.length ? (
              <p className="rounded-md border border-dashed border-border p-5 text-sm text-muted">
                No visible bookings yet.
              </p>
            ) : null}
            {bookings.map((booking) => (
              <article
                key={booking.id}
                className="grid gap-4 rounded-md border border-border bg-surface p-4 sm:grid-cols-[minmax(0,1fr)_auto]"
              >
                <div>
                  <p className="font-semibold">{booking.title}</p>
                  <p className="mt-1 text-sm text-muted">{booking.venue}</p>
                  <p className="mt-2 text-sm text-muted">
                    {booking.startTime
                      ? new Date(booking.startTime).toLocaleString("en-IN")
                      : "Time to be announced"}{" "}
                    · Seats {booking.seats.join(", ")}
                  </p>
                  <p className="mt-2 text-xs font-semibold text-secondary">
                    {booking.status.replaceAll("_", " ")} · INR {booking.total}
                  </p>
                  {booking.refund ? (
                    <p className="mt-2 text-xs text-warning">
                      Refund {booking.refund.status}: INR{" "}
                      {booking.refund.approvedAmount ??
                        booking.refund.requestedAmount}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-start gap-2 sm:justify-end">
                  {booking.ticketId ? (
                    <Link
                      href={`/tickets/${booking.ticketId}`}
                      className="inline-flex h-9 items-center rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground"
                    >
                      View ticket
                    </Link>
                  ) : null}
                  {booking.status === "CONFIRMED" ? (
                    <button
                      type="button"
                      onClick={() => void cancel(booking.id)}
                      className="inline-flex h-9 items-center gap-1 rounded-md border border-accent/50 px-3 text-xs font-semibold text-accent"
                    >
                      <XCircle className="size-3.5" /> Cancel
                    </button>
                  ) : null}
                  {booking.status === "CONFIRMED" &&
                  booking.contentType === "MOVIE" &&
                  booking.cinemaId ? (
                    <Link
                      href={`/food?bookingId=${booking.id}&cinemaId=${booking.cinemaId}`}
                      className="inline-flex h-9 items-center rounded-md border border-secondary/50 px-3 text-xs font-semibold text-secondary"
                    >
                      Order food
                    </Link>
                  ) : null}
                  {booking.status === "CONFIRMED" ? (
                    <button
                      type="button"
                      onClick={() => void cancel(booking.id, true)}
                      className="inline-flex h-9 items-center gap-1 rounded-md border border-warning/50 px-3 text-xs font-semibold text-warning"
                    >
                      Request refund
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => void hide(booking.id)}
                    className="inline-flex h-9 items-center gap-1 rounded-md border border-border px-3 text-xs text-muted"
                  >
                    <EyeOff className="size-3.5" /> Hide
                  </button>
                </div>
                {booking.reviewTarget &&
                booking.startTime &&
                new Date(booking.startTime) <= new Date() ? (
                  <div className="sm:col-span-2 grid gap-2 border-t border-border pt-3 sm:grid-cols-[100px_minmax(0,1fr)_auto]">
                    <select
                      value={reviewDrafts[booking.id]?.rating ?? "5"}
                      onChange={(event) =>
                        setReviewDrafts((current) => ({
                          ...current,
                          [booking.id]: {
                            rating: event.target.value,
                            comment: current[booking.id]?.comment ?? "",
                          },
                        }))
                      }
                      className="h-9 rounded-md border border-border bg-background px-2 text-sm"
                    >
                      <option value="5">5 stars</option>
                      <option value="4">4 stars</option>
                      <option value="3">3 stars</option>
                      <option value="2">2 stars</option>
                      <option value="1">1 star</option>
                    </select>
                    <input
                      value={reviewDrafts[booking.id]?.comment ?? ""}
                      onChange={(event) =>
                        setReviewDrafts((current) => ({
                          ...current,
                          [booking.id]: {
                            rating: current[booking.id]?.rating ?? "5",
                            comment: event.target.value,
                          },
                        }))
                      }
                      placeholder="Share your experience"
                      className="h-9 rounded-md border border-border bg-background px-3 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => void submitReview(booking)}
                      className="h-9 rounded-md border border-secondary/50 px-3 text-xs font-semibold text-secondary"
                    >
                      Rate
                    </button>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
