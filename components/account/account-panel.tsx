"use client";

import Link from "next/link";
import {
  BadgePercent,
  Eye,
  EyeOff,
  Gift,
  Heart,
  LoaderCircle,
  LogOut,
  Ticket,
  WalletCards,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase/client";
import { WalletRecharge } from "./wallet-recharge";

type Profile = {
  name: string;
  email: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: "FEMALE" | "MALE" | "NON_BINARY" | "PREFER_NOT_TO_SAY";
  address?: {
    line1?: string;
    line2?: string;
    locality?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
};

const emptyAddress = {
  line1: "",
  line2: "",
  locality: "",
  state: "",
  postalCode: "",
  country: "India",
};
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
    balanceAfter: number;
    note?: string;
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

async function readApiPayload(response: Response) {
  const body = await response.text();
  if (!body.trim())
    return {
      error:
        "The account service did not return a response. Please try again shortly.",
    };
  try {
    return JSON.parse(body) as { error?: string; [key: string]: unknown };
  } catch {
    return {
      error:
        "The account service returned an invalid response. Please try again shortly.",
    };
  }
}

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
  const payload = await readApiPayload(response);
  if (!response.ok) throw new Error(payload.error ?? "Request failed.");
  return payload;
}

export function AccountPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [favorites, setFavorites] = useState<unknown[]>([]);
  const [wallet, setWallet] = useState<WalletState | null>(null);
  const [referral, setReferral] = useState<ReferralState | null>(null);
  const [memberships, setMemberships] = useState<MembershipState | null>(null);
  const [passes, setPasses] = useState<WalletPass[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [changingPassword, setChangingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [reviewDrafts, setReviewDrafts] = useState<
    Record<string, { rating: string; comment: string }>
  >({});
  const activeTab = ["profile", "wallet", "settings", "bookings"].includes(
    searchParams.get("tab") ?? "",
  )
    ? (searchParams.get("tab") as
        "profile" | "wallet" | "settings" | "bookings")
    : "profile";

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
          dateOfBirth: profile.dateOfBirth?.slice(0, 10) ?? "",
          gender: profile.gender ?? "",
          address: { ...emptyAddress, ...profile.address },
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

  const changePassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const currentPassword = String(form.get("currentPassword") ?? "");
    const newPassword = String(form.get("newPassword") ?? "");
    const confirmPassword = String(form.get("confirmPassword") ?? "");

    if (newPassword.length < 6) {
      setMessage("Your new password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage("Your new passwords do not match.");
      return;
    }

    const user = firebaseAuth.currentUser;
    const hasPasswordLogin = user?.providerData.some(
      (provider) => provider.providerId === "password",
    );
    if (!user?.email || !hasPasswordLogin) {
      setMessage(
        "This account uses Google sign-in, so its password is managed by Google.",
      );
      return;
    }

    setChangingPassword(true);
    setMessage("");
    try {
      const credential = EmailAuthProvider.credential(
        user.email,
        currentPassword,
      );
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      event.currentTarget.reset();
      setMessage("Your password has been changed successfully.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to change your password. Please try again.",
      );
    } finally {
      setChangingPassword(false);
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

  const signOut = async () => {
    setSigningOut(true);
    setMessage("");
    sessionStorage.setItem("show-time-post-logout", "true");

    try {
      await firebaseAuth.signOut();
      router.replace("/");
    } catch (error) {
      sessionStorage.removeItem("show-time-post-logout");
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to sign out. Please try again.",
      );
      setSigningOut(false);
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
        <nav
          className="mt-6 grid gap-1 border-t border-border pt-4"
          aria-label="Account sections"
        >
          {[
            ["profile", "Profile"],
            ["wallet", "My wallet"],
            ["settings", "Settings"],
            ["bookings", "Booking history"],
          ].map(([tab, label]) => (
            <Link
              href={`/account?tab=${tab}`}
              key={tab}
              className={`flex h-10 items-center rounded-lg px-3 text-sm font-semibold transition-colors ${
                activeTab === tab
                  ? "bg-primary/10 text-primary"
                  : "text-muted hover:bg-surface-muted hover:text-foreground"
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>
        <button
          type="button"
          onClick={() => void signOut()}
          disabled={signingOut}
          className="mt-6 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-accent/50 px-4 text-sm font-semibold text-accent transition-colors hover:border-accent hover:bg-accent hover:text-accent-foreground disabled:cursor-wait disabled:opacity-55"
        >
          <LogOut className="size-4" aria-hidden="true" />
          {signingOut ? "Signing out..." : "Log out"}
        </button>
      </aside>
      <div className="space-y-8">
        {message ? (
          <p className="rounded-md border border-secondary/40 bg-secondary/10 px-4 py-3 text-sm text-foreground">
            {message}
          </p>
        ) : null}
        <section className={activeTab === "profile" ? "" : "hidden"}>
          <div>
            <h2 className="text-lg font-semibold">Personal details</h2>
            <p className="mt-1 text-sm text-muted">
              Keep your contact and billing details up to date for faster bookings.
            </p>
          </div>
          <form
            onSubmit={saveProfile}
            className="mt-4 grid gap-4 rounded-xl border border-border bg-surface p-5 sm:grid-cols-2"
          >
            <label className="grid gap-1 text-sm">
              Full name
              <input
                required
                value={profile.name}
                onChange={(event) =>
                  setProfile({ ...profile, name: event.target.value })
                }
                className="h-10 rounded-md border border-border bg-background px-3"
              />
            </label>
            <label className="grid gap-1 text-sm">
              Email address
              <input
                value={profile.email}
                readOnly
                aria-readonly="true"
                className="h-10 cursor-not-allowed rounded-md border border-border bg-surface-muted px-3 text-muted"
              />
              <span className="text-xs text-muted">
                Your sign-in email is managed securely by your account provider.
              </span>
            </label>
            <label className="grid gap-1 text-sm">
              Phone
              <input
                type="tel"
                autoComplete="tel"
                value={profile.phone ?? ""}
                onChange={(event) =>
                  setProfile({ ...profile, phone: event.target.value })
                }
                className="h-10 rounded-md border border-border bg-background px-3"
              />
            </label>
            <label className="grid gap-1 text-sm">
              Date of birth
              <input
                type="date"
                max={new Date().toISOString().slice(0, 10)}
                value={profile.dateOfBirth?.slice(0, 10) ?? ""}
                onChange={(event) =>
                  setProfile({ ...profile, dateOfBirth: event.target.value })
                }
                className="h-10 rounded-md border border-border bg-background px-3"
              />
            </label>
            <label className="grid gap-1 text-sm">
              Gender
              <select
                value={profile.gender ?? ""}
                onChange={(event) =>
                  setProfile({
                    ...profile,
                    gender: (event.target.value || undefined) as Profile["gender"],
                  })
                }
                className="h-10 rounded-md border border-border bg-background px-3"
              >
                <option value="">Prefer not to say</option>
                <option value="FEMALE">Female</option>
                <option value="MALE">Male</option>
                <option value="NON_BINARY">Non-binary</option>
                <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
              </select>
            </label>
            <div className="sm:col-span-2">
              <p className="text-sm font-semibold">Address</p>
              <p className="mt-1 text-xs text-muted">
                Used only for account records and applicable invoices.
              </p>
            </div>
            <label className="grid gap-1 text-sm sm:col-span-2">
              Address line 1
              <input
                autoComplete="address-line1"
                value={profile.address?.line1 ?? ""}
                onChange={(event) =>
                  setProfile({
                    ...profile,
                    address: {
                      ...emptyAddress,
                      ...profile.address,
                      line1: event.target.value,
                    },
                  })
                }
                className="h-10 rounded-md border border-border bg-background px-3"
              />
            </label>
            <label className="grid gap-1 text-sm sm:col-span-2">
              Address line 2 <span className="text-muted">(optional)</span>
              <input
                autoComplete="address-line2"
                value={profile.address?.line2 ?? ""}
                onChange={(event) =>
                  setProfile({
                    ...profile,
                    address: {
                      ...emptyAddress,
                      ...profile.address,
                      line2: event.target.value,
                    },
                  })
                }
                className="h-10 rounded-md border border-border bg-background px-3"
              />
            </label>
            <label className="grid gap-1 text-sm">
              City / locality
              <input
                autoComplete="address-level2"
                value={profile.address?.locality ?? ""}
                onChange={(event) =>
                  setProfile({
                    ...profile,
                    address: {
                      ...emptyAddress,
                      ...profile.address,
                      locality: event.target.value,
                    },
                  })
                }
                className="h-10 rounded-md border border-border bg-background px-3"
              />
            </label>
            <label className="grid gap-1 text-sm">
              State
              <input
                autoComplete="address-level1"
                value={profile.address?.state ?? ""}
                onChange={(event) =>
                  setProfile({
                    ...profile,
                    address: {
                      ...emptyAddress,
                      ...profile.address,
                      state: event.target.value,
                    },
                  })
                }
                className="h-10 rounded-md border border-border bg-background px-3"
              />
            </label>
            <label className="grid gap-1 text-sm">
              PIN / postal code
              <input
                autoComplete="postal-code"
                value={profile.address?.postalCode ?? ""}
                onChange={(event) =>
                  setProfile({
                    ...profile,
                    address: {
                      ...emptyAddress,
                      ...profile.address,
                      postalCode: event.target.value,
                    },
                  })
                }
                className="h-10 rounded-md border border-border bg-background px-3"
              />
            </label>
            <label className="grid gap-1 text-sm">
              Country
              <input
                autoComplete="country-name"
                value={profile.address?.country ?? "India"}
                onChange={(event) =>
                  setProfile({
                    ...profile,
                    address: {
                      ...emptyAddress,
                      ...profile.address,
                      country: event.target.value,
                    },
                  })
                }
                className="h-10 rounded-md border border-border bg-background px-3"
              />
            </label>
            <button className="premium-button h-10 px-4 text-sm font-semibold sm:col-span-2 sm:w-fit">
              Save personal details
            </button>
          </form>
        </section>
        <section className={activeTab === "settings" ? "" : "hidden"}>
          <h2 className="text-lg font-semibold">Password & security</h2>
          <p className="mt-1 text-sm text-muted">
            Confirm your current password before choosing a new one.
          </p>
          <form
            onSubmit={changePassword}
            className="mt-4 grid gap-3 rounded-md border border-border bg-surface p-4 sm:grid-cols-2"
          >
            <label className="grid gap-1 text-sm sm:col-span-2">
              Current password
              <span className="relative">
                <input
                  name="currentPassword"
                  required
                  type={showCurrentPassword ? "text" : "password"}
                  autoComplete="current-password"
                  className="h-10 w-full rounded-md border border-border bg-background px-3 pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword((current) => !current)}
                  className="absolute right-1 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-md text-muted hover:bg-surface-muted hover:text-foreground"
                  aria-label={
                    showCurrentPassword ? "Hide current password" : "Show current password"
                  }
                  aria-pressed={showCurrentPassword}
                >
                  {showCurrentPassword ? (
                    <EyeOff className="size-4" aria-hidden="true" />
                  ) : (
                    <Eye className="size-4" aria-hidden="true" />
                  )}
                </button>
              </span>
            </label>
            <label className="grid gap-1 text-sm">
              New password
              <span className="relative">
                <input
                  name="newPassword"
                  required
                  type={showNewPassword ? "text" : "password"}
                  minLength={6}
                  autoComplete="new-password"
                  className="h-10 w-full rounded-md border border-border bg-background px-3 pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((current) => !current)}
                  className="absolute right-1 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-md text-muted hover:bg-surface-muted hover:text-foreground"
                  aria-label={showNewPassword ? "Hide new password" : "Show new password"}
                  aria-pressed={showNewPassword}
                >
                  {showNewPassword ? (
                    <EyeOff className="size-4" aria-hidden="true" />
                  ) : (
                    <Eye className="size-4" aria-hidden="true" />
                  )}
                </button>
              </span>
            </label>
            <label className="grid gap-1 text-sm">
              Confirm new password
              <span className="relative">
                <input
                  name="confirmPassword"
                  required
                  type={showConfirmPassword ? "text" : "password"}
                  minLength={6}
                  autoComplete="new-password"
                  className="h-10 w-full rounded-md border border-border bg-background px-3 pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((current) => !current)}
                  className="absolute right-1 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-md text-muted hover:bg-surface-muted hover:text-foreground"
                  aria-label={
                    showConfirmPassword
                      ? "Hide confirmed password"
                      : "Show confirmed password"
                  }
                  aria-pressed={showConfirmPassword}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="size-4" aria-hidden="true" />
                  ) : (
                    <Eye className="size-4" aria-hidden="true" />
                  )}
                </button>
              </span>
            </label>
            <button
              disabled={changingPassword}
              className="premium-button h-10 px-4 text-sm font-semibold sm:w-fit disabled:cursor-not-allowed disabled:opacity-50"
            >
              {changingPassword ? "Changing password..." : "Change password"}
            </button>
          </form>
        </section>
        <section className={activeTab === "wallet" ? "" : "hidden"}>
          <div>
            <h2 className="text-lg font-semibold">My wallet</h2>
            <p className="mt-1 text-sm text-muted">
              Manage your balance, rewards, payment activity, and passes.
            </p>
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
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
                {memberships?.activeSubscription?.plan?.name ??
                  "No active plan"}
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
          </div>
          <div className="mt-4">
            <WalletRecharge onRefresh={load} />
          </div>
          <div className="mt-8">
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
          </div>
          <section className="mt-8">
            <h2 className="text-lg font-semibold">Payment activity</h2>
            <div className="mt-4 overflow-hidden rounded-md border border-border">
              {wallet?.transactions?.length ? (
                <div className="divide-y divide-border">
                  {wallet.transactions.map((transaction) => {
                    const isCredit = [
                      "CREDIT",
                      "REWARD_EARN",
                      "REFUND",
                    ].includes(transaction.type);
                    return (
                      <div
                        key={transaction._id}
                        className="grid gap-1 px-4 py-3 text-sm sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center sm:gap-4"
                      >
                        <div>
                          <p className="font-medium text-foreground">
                            {transaction.note ??
                              transaction.source.replaceAll("_", " ")}
                          </p>
                          <p className="mt-0.5 text-xs text-muted">
                            {new Date(transaction.createdAt).toLocaleString(
                              "en-IN",
                            )}
                          </p>
                        </div>
                        <p className="text-xs font-semibold text-muted">
                          Balance: INR{" "}
                          {transaction.balanceAfter.toLocaleString("en-IN")}
                        </p>
                        <p
                          className={
                            isCredit
                              ? "font-semibold text-success"
                              : "font-semibold text-accent"
                          }
                        >
                          {isCredit ? "+" : "-"} INR{" "}
                          {transaction.amount.toLocaleString("en-IN")}
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="px-4 py-5 text-sm text-muted">
                  Your payments and wallet activity will appear here.
                </p>
              )}
            </div>
          </section>
        </section>
        <section className={activeTab === "bookings" ? "" : "hidden"}>
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
