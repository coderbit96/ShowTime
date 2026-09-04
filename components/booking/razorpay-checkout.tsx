"use client";

import { useState } from "react";
import { CreditCard, LoaderCircle } from "lucide-react";
import { firebaseAuth } from "@/lib/firebase/client";

type RazorpayOrder = {
  paymentId: string;
  bookingId: string;
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
};

declare global {
  interface Window {
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
  }
}

let razorpayScript: Promise<boolean> | null = null;

function loadRazorpayCheckout() {
  if (window.Razorpay) return Promise.resolve(true);
  razorpayScript ??= new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
  return razorpayScript;
}

export function RazorpayCheckout({
  bookingId,
  total,
}: {
  bookingId: string;
  total: number;
}) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [idempotencyKey] = useState(() =>
    typeof crypto?.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`,
  );

  const startCheckout = async () => {
    if (loading) return;
    const token = await firebaseAuth.currentUser?.getIdToken();
    if (!token) {
      setMessage("Sign in to continue payment.");
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const orderResponse = await fetch("/api/payments/orders", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ bookingId, idempotencyKey }),
      });
      const orderPayload = (await orderResponse.json()) as {
        order?: RazorpayOrder;
        error?: string;
      };
      if (!orderResponse.ok)
        throw new Error(
          orderPayload.error ?? "Unable to create the payment order.",
        );
      if (!orderPayload.order)
        throw new Error("The payment order response was incomplete.");
      if (!(await loadRazorpayCheckout()) || !window.Razorpay)
        throw new Error("Razorpay checkout could not be loaded.");

      const checkout = new window.Razorpay({
        key: orderPayload.order.keyId,
        amount: orderPayload.order.amount,
        currency: orderPayload.order.currency,
        name: "Show Time",
        description: `Booking ${bookingId.slice(-8)}`,
        order_id: orderPayload.order.orderId,
        handler: async (response) => {
          try {
            const verification = await fetch("/api/payments/verify", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                bookingId,
                orderId: response.razorpay_order_id,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
              }),
            });
            const payload = (await verification.json()) as { error?: string };
            if (!verification.ok)
              throw new Error(payload.error ?? "Payment verification failed.");
            setMessage("Payment received. Confirming your booking securely...");
          } catch (verificationError) {
            setMessage(
              verificationError instanceof Error
                ? verificationError.message
                : "Payment verification failed.",
            );
          } finally {
            setLoading(false);
          }
        },
        modal: { ondismiss: () => setLoading(false) },
      });
      checkout.open();
    } catch (checkoutError) {
      setMessage(
        checkoutError instanceof Error
          ? checkoutError.message
          : "Unable to start payment.",
      );
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto mt-6 max-w-sm">
      <button
        type="button"
        onClick={() => void startCheckout()}
        disabled={loading}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-cta px-4 text-sm font-semibold text-cta-foreground transition-colors hover:bg-cta-hover disabled:cursor-not-allowed disabled:opacity-45"
      >
        {loading ? (
          <LoaderCircle className="size-4 animate-spin" />
        ) : (
          <CreditCard className="size-4" />
        )}
        {loading
          ? "Opening payment..."
          : `Pay INR ${total.toLocaleString("en-IN")}`}
      </button>
      {message ? <p className="mt-3 text-sm text-muted">{message}</p> : null}
    </div>
  );
}
