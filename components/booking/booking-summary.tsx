"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, LoaderCircle, Ticket } from "lucide-react";
import { useRouter } from "next/navigation";
import { firebaseAuth } from "@/lib/firebase/client";
import { RazorpayCheckout } from "./razorpay-checkout";

type Summary = {
  showId: string;
  lockId: string;
  seats: Array<{ seatId: string; category: string; price: number }>;
  pricing: {
    basePrice: number;
    convenienceFee: number;
    tax: number;
    subtotal: number;
    discount: number;
    total: number;
    organizerShare: number;
    platformCommission: number;
    platformRevenue: number;
    currency: "INR";
  };
  coupon?: { id: string; code: string };
  expiresAt: string;
};
type PendingBooking = Summary & { bookingId: string; status: "PENDING" };

export function BookingSummary({
  showId,
  lockId,
  groupId,
}: {
  showId: string;
  lockId: string;
  groupId?: string;
}) {
  const router = useRouter();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [baseSummary, setBaseSummary] = useState<Summary | null>(null);
  const [booking, setBooking] = useState<PendingBooking | null>(null);
  const [coupon, setCoupon] = useState("");
  const [couponError, setCouponError] = useState("");
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [releasing, setReleasing] = useState(false);
  const [error, setError] = useState("");
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [idempotencyKey] = useState(() =>
    typeof crypto?.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`,
  );

  useEffect(() => {
    const loadSummary = async () => {
      const token = await firebaseAuth.currentUser?.getIdToken();
      if (!token) {
        setError("Sign in to continue checkout.");
        setLoading(false);
        return;
      }
      try {
        const response = await fetch(
          `/api/bookings/summary?showId=${encodeURIComponent(showId)}&lockId=${encodeURIComponent(lockId)}`,
          { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" },
        );
        const payload = (await response.json()) as {
          summary?: Summary;
          error?: string;
        };
        if (!response.ok)
          throw new Error(
            payload.error ?? "Unable to load your booking summary.",
          );
        if (!payload.summary)
          throw new Error("The booking summary response was incomplete.");
        setSummary(payload.summary);
        setBaseSummary(payload.summary);
      } catch (summaryError) {
        setError(
          summaryError instanceof Error
            ? summaryError.message
            : "Unable to load your booking summary.",
        );
      } finally {
        setLoading(false);
      }
    };
    void loadSummary();
  }, [lockId, showId]);

  useEffect(() => {
    const expiresAt = booking?.expiresAt ?? summary?.expiresAt;
    if (!expiresAt || booking) return;
    const updateRemaining = () => {
      const seconds = Math.max(
        0,
        Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000),
      );
      setRemainingSeconds(seconds);
      if (seconds === 0)
        setError(
          "Your seat hold expired. Return to seat selection and try again.",
        );
    };
    const initialUpdate = window.setTimeout(updateRemaining, 0);
    const interval = window.setInterval(updateRemaining, 1000);
    return () => {
      window.clearTimeout(initialUpdate);
      window.clearInterval(interval);
    };
  }, [booking, summary]);

  const returnToSeats = async () => {
    if (!booking) {
      const token = await firebaseAuth.currentUser?.getIdToken();
      if (token) {
        setReleasing(true);
        try {
          await fetch(`/api/shows/${encodeURIComponent(showId)}/locks`, {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ lockId }),
          });
        } finally {
          setReleasing(false);
        }
      }
    }
    const groupQuery = groupId ? `&groupId=${encodeURIComponent(groupId)}` : "";
    router.push(
      `/booking?showId=${encodeURIComponent(showId)}&notice=${encodeURIComponent("Your seat hold was released. Choose seats to continue.")}${groupQuery}`,
    );
  };

  const createBooking = async () => {
    if (!summary || creating || error) return;
    const token = await firebaseAuth.currentUser?.getIdToken();
    if (!token) {
      setError("Sign in to create your booking.");
      return;
    }
    setCreating(true);
    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          showId,
          lockId,
          idempotencyKey,
          ...(summary.coupon ? { couponCode: summary.coupon.code } : {}),
          ...(groupId ? { groupBookingId: groupId } : {}),
        }),
      });
      const payload = (await response.json()) as {
        booking?: PendingBooking;
        error?: string;
      };
      if (!response.ok)
        throw new Error(payload.error ?? "Unable to create your booking.");
      if (!payload.booking)
        throw new Error("The pending booking response was incomplete.");
      setBooking(payload.booking);
      setError("");
    } catch (bookingError) {
      setError(
        bookingError instanceof Error
          ? bookingError.message
          : "Unable to create your booking.",
      );
    } finally {
      setCreating(false);
    }
  };

  const applyCoupon = async () => {
    if (!coupon || !summary || applyingCoupon) return;
    const token = await firebaseAuth.currentUser?.getIdToken();
    if (!token) {
      setCouponError("Sign in to apply a coupon.");
      return;
    }
    setApplyingCoupon(true);
    setCouponError("");
    try {
      const response = await fetch("/api/coupons/apply", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ showId, lockId, code: coupon }),
      });
      const payload = (await response.json()) as {
        summary?: Summary;
        error?: string;
      };
      if (!response.ok)
        throw new Error(payload.error ?? "Unable to apply this coupon.");
      if (!payload.summary)
        throw new Error("The coupon response was incomplete.");
      setSummary(payload.summary);
      setCoupon(payload.summary.coupon?.code ?? coupon);
    } catch (couponApplyError) {
      setCouponError(
        couponApplyError instanceof Error
          ? couponApplyError.message
          : "Unable to apply this coupon.",
      );
    } finally {
      setApplyingCoupon(false);
    }
  };

  if (loading)
    return (
      <div className="grid min-h-80 place-items-center rounded-md border border-border bg-surface text-sm text-muted">
        <span className="inline-flex items-center gap-2">
          <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          Loading checkout...
        </span>
      </div>
    );

  if (!summary)
    return (
      <div className="rounded-md border border-accent/50 bg-accent/10 p-5 text-sm text-foreground">
        <p>{error || "Your seat hold is no longer available."}</p>
        <button
          type="button"
          onClick={() => void returnToSeats()}
          className="mt-4 inline-flex h-10 items-center justify-center rounded-md bg-accent px-4 text-sm font-semibold text-accent-foreground"
        >
          Return to seats
        </button>
      </div>
    );

  if (booking)
    return (
      <section className="rounded-md border border-secondary/45 bg-secondary/10 p-6 text-center sm:p-10">
        <CheckCircle2
          className="mx-auto size-10 text-secondary"
          aria-hidden="true"
        />
        <h1 className="mt-4 text-2xl font-semibold">Booking reserved</h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
          Your pending booking is ready for payment. Payment setup is the next
          checkout step.
        </p>
        <p className="mt-5 font-mono text-sm text-foreground">
          {booking.bookingId}
        </p>
        <RazorpayCheckout
          bookingId={booking.bookingId}
          total={booking.pricing.total}
        />
      </section>
    );

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section className="rounded-md border border-border bg-surface p-5 sm:p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-secondary">
          Booking summary
        </p>
        <h1 className="mt-1 text-2xl font-semibold">Review your seats</h1>
        <div className="mt-6 grid gap-3">
          {summary.seats.map((seat) => (
            <div
              key={seat.seatId}
              className="flex items-center justify-between gap-3 border-b border-border pb-3 text-sm"
            >
              <span>
                <strong>{seat.seatId}</strong>
                <span className="ml-2 text-muted">{seat.category}</span>
              </span>
              <span>{formatMoney(seat.price)}</span>
            </div>
          ))}
        </div>
        <div className="mt-7 border-t border-border pt-6">
          <label className="text-sm font-semibold" htmlFor="coupon">
            Promo code
          </label>
          <div className="mt-2 flex gap-2">
            <input
              id="coupon"
              value={coupon}
              onChange={(event) => {
                setCoupon(event.target.value.toUpperCase());
                setCouponError("");
                if (summary.coupon && baseSummary) setSummary(baseSummary);
              }}
              placeholder="Enter code"
              className="h-10 min-w-0 flex-1 rounded-sm border border-border bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted focus:border-secondary"
            />
            <button
              type="button"
              onClick={() => void applyCoupon()}
              disabled={!coupon || applyingCoupon}
              className="h-10 rounded-sm border border-border px-4 text-sm font-semibold text-muted disabled:opacity-45"
            >
              {applyingCoupon ? "Applying..." : "Apply"}
            </button>
          </div>
          {couponError ? (
            <p className="mt-2 text-sm text-accent">{couponError}</p>
          ) : summary.coupon ? (
            <p className="mt-2 text-sm text-secondary">
              {summary.coupon.code} applied
            </p>
          ) : null}
        </div>
      </section>

      <aside className="lg:sticky lg:top-20 lg:self-start">
        <section className="rounded-md border border-border bg-surface p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-secondary">
            Price details
          </p>
          <dl className="mt-5 grid gap-3 text-sm text-muted">
            <PriceLine
              label="Tickets"
              value={formatMoney(summary.pricing.basePrice)}
            />
            <PriceLine
              label="Convenience fee"
              value={formatMoney(summary.pricing.convenienceFee)}
            />
            <PriceLine label="Tax" value={formatMoney(summary.pricing.tax)} />
            <PriceLine
              label="Subtotal"
              value={formatMoney(summary.pricing.subtotal)}
            />
            <PriceLine
              label={
                summary.coupon ? `Coupon (${summary.coupon.code})` : "Discount"
              }
              value={`-${formatMoney(summary.pricing.discount)}`}
            />
          </dl>
          <div className="mt-5 flex items-center justify-between border-t border-border pt-4 text-lg font-semibold">
            <span>Total</span>
            <span>{formatMoney(summary.pricing.total)}</span>
          </div>
          <p className="mt-3 text-center font-mono text-sm text-secondary">
            Hold ends in {formatCountdown(remainingSeconds)}
          </p>
          {error ? (
            <p className="mt-3 rounded-sm border border-accent/50 bg-accent/10 px-3 py-2 text-sm text-foreground">
              {error}
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => void createBooking()}
            disabled={creating || Boolean(error)}
            className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-accent px-4 text-sm font-semibold text-accent-foreground transition-colors hover:bg-warning disabled:cursor-not-allowed disabled:opacity-45"
          >
            {creating ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Ticket className="size-4" />
            )}
            {creating ? "Creating booking..." : "Continue"}
          </button>
          <button
            type="button"
            onClick={() => void returnToSeats()}
            disabled={releasing || creating}
            className="mt-3 inline-flex h-10 w-full items-center justify-center text-sm font-semibold text-muted hover:text-foreground disabled:opacity-45"
          >
            {releasing ? "Returning..." : "Change seats"}
          </button>
        </section>
      </aside>
    </div>
  );
}

function PriceLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function formatMoney(value: number) {
  return `\u20b9${value.toLocaleString("en-IN")}`;
}

function formatCountdown(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}
