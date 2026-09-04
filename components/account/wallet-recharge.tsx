"use client";

import { useRef, useState } from "react";
import { CreditCard, LoaderCircle, Plus } from "lucide-react";
import { firebaseAuth } from "@/lib/firebase/client";

type RazorpayOrder = {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
};

type RazorpayWindow = Window & {
  Razorpay?: new (options: {
    key: string;
    amount: number;
    currency: string;
    name: string;
    description: string;
    order_id: string;
    handler: (response: {
      razorpay_payment_id: string;
      razorpay_order_id: string;
      razorpay_signature: string;
    }) => void | Promise<void>;
    modal: { ondismiss: () => void };
  }) => { open: () => void };
};

let razorpayScript: Promise<boolean> | null = null;

function loadRazorpayCheckout() {
  const razorpayWindow = window as RazorpayWindow;
  if (razorpayWindow.Razorpay) return Promise.resolve(true);
  razorpayScript ??= new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
  return razorpayScript;
}

function createIdempotencyKey() {
  return typeof crypto?.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;
}

export function WalletRecharge({
  onRefresh,
}: {
  onRefresh: () => Promise<void>;
}) {
  const [amount, setAmount] = useState("500");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const idempotencyKeyRef = useRef<string | null>(null);

  const changeAmount = (value: string) => {
    idempotencyKeyRef.current = null;
    setAmount(value);
  };

  const recharge = async () => {
    const value = Number(amount);
    if (!Number.isInteger(value) || value < 100 || value > 10_000) {
      setMessage("Enter a whole amount from INR 100 to INR 10,000.");
      return;
    }
    const token = await firebaseAuth.currentUser?.getIdToken();
    if (!token) {
      setMessage("Sign in to recharge your wallet.");
      return;
    }

    setLoading(true);
    setMessage("");
    const idempotencyKey = idempotencyKeyRef.current ?? createIdempotencyKey();
    idempotencyKeyRef.current = idempotencyKey;
    try {
      const orderResponse = await fetch("/api/wallet/top-ups/orders", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ amount: value, idempotencyKey }),
      });
      const orderPayload = (await orderResponse.json()) as {
        order?: RazorpayOrder;
        error?: string;
      };
      if (!orderResponse.ok || !orderPayload.order)
        throw new Error(
          orderPayload.error ?? "Unable to start wallet recharge.",
        );
      if (!(await loadRazorpayCheckout()))
        throw new Error("Razorpay checkout could not be loaded.");
      const razorpayWindow = window as RazorpayWindow;
      if (!razorpayWindow.Razorpay)
        throw new Error("Razorpay checkout could not be loaded.");

      const checkout = new razorpayWindow.Razorpay({
        key: orderPayload.order.keyId,
        amount: orderPayload.order.amount,
        currency: orderPayload.order.currency,
        name: "Show Time",
        description: "Wallet recharge",
        order_id: orderPayload.order.orderId,
        handler: async (response) => {
          try {
            const verification = await fetch("/api/wallet/top-ups/verify", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                orderId: response.razorpay_order_id,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
              }),
            });
            const payload = (await verification.json()) as { error?: string };
            if (!verification.ok)
              throw new Error(payload.error ?? "Recharge verification failed.");
            setMessage(
              "Payment received. Your wallet will update after secure confirmation.",
            );
            window.setTimeout(() => void onRefresh(), 2_000);
          } catch (error) {
            setMessage(
              error instanceof Error
                ? error.message
                : "Recharge verification failed.",
            );
          } finally {
            idempotencyKeyRef.current = null;
            setLoading(false);
          }
        },
        modal: { ondismiss: () => setLoading(false) },
      });
      checkout.open();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to start wallet recharge.",
      );
      setLoading(false);
    }
  };

  return (
    <section className="rounded-xl border border-border bg-surface p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-secondary/15 text-secondary">
          <Plus className="size-5" aria-hidden="true" />
        </span>
        <div>
          <h3 className="font-semibold text-foreground">Recharge wallet</h3>
          <p className="mt-1 text-sm text-muted">
            Add INR 100–10,000 securely using Razorpay.
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {[200, 500, 1_000].map((suggestedAmount) => (
          <button
            type="button"
            key={suggestedAmount}
            onClick={() => changeAmount(String(suggestedAmount))}
            className={`h-9 rounded-lg border px-3 text-sm font-semibold transition-colors ${
              amount === String(suggestedAmount)
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted hover:bg-surface-muted hover:text-foreground"
            }`}
          >
            INR {suggestedAmount.toLocaleString("en-IN")}
          </button>
        ))}
      </div>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <label className="sr-only" htmlFor="wallet-recharge-amount">
          Recharge amount
        </label>
        <input
          id="wallet-recharge-amount"
          inputMode="numeric"
          pattern="[0-9]*"
          value={amount}
          onChange={(event) => changeAmount(event.target.value)}
          className="h-11 min-w-0 flex-1 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          aria-describedby="wallet-recharge-note"
        />
        <button
          type="button"
          onClick={() => void recharge()}
          disabled={loading}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-cta px-4 text-sm font-semibold text-cta-foreground transition-colors hover:bg-cta-hover disabled:cursor-wait disabled:opacity-60"
        >
          {loading ? (
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <CreditCard className="size-4" aria-hidden="true" />
          )}
          {loading ? "Opening payment..." : "Recharge"}
        </button>
      </div>
      <p id="wallet-recharge-note" className="mt-3 text-xs text-muted">
        Your balance is credited only after Razorpay confirms the payment.
      </p>
      {message ? <p className="mt-2 text-sm text-muted">{message}</p> : null}
    </section>
  );
}
