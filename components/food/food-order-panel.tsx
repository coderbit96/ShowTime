"use client";

import { useEffect, useMemo, useState } from "react";
import { LoaderCircle, Popcorn } from "lucide-react";
import { firebaseAuth } from "@/lib/firebase/client";

type FoodItem = {
  _id: string;
  name: string;
  description?: string;
  category: string;
  price: number;
};

export function FoodOrderPanel({
  bookingId,
  cinemaId,
}: {
  bookingId: string;
  cinemaId: string;
}) {
  const [items, setItems] = useState<FoodItem[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [ordering, setOrdering] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch(
          `/api/food/items?cinemaId=${encodeURIComponent(cinemaId)}`,
          { cache: "no-store" },
        );
        const payload = (await response.json()) as {
          items?: FoodItem[];
          error?: string;
        };
        if (!response.ok)
          throw new Error(payload.error ?? "Unable to load food menu.");
        setItems(payload.items ?? []);
      } catch (error) {
        setMessage(
          error instanceof Error ? error.message : "Unable to load food menu.",
        );
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [cinemaId]);

  const selectedItems = useMemo(
    () =>
      Object.entries(quantities)
        .filter(([, quantity]) => quantity > 0)
        .map(([itemId, quantity]) => ({ itemId, quantity })),
    [quantities],
  );
  const total = selectedItems.reduce((sum, selected) => {
    const item = items.find((entry) => entry._id === selected.itemId);
    return sum + (item?.price ?? 0) * selected.quantity;
  }, 0);

  const order = async () => {
    if (!selectedItems.length || ordering) return;
    const token = await firebaseAuth.currentUser?.getIdToken();
    if (!token) {
      setMessage("Sign in to order food.");
      return;
    }
    setOrdering(true);
    setMessage("");
    try {
      const response = await fetch("/api/food/orders", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bookingId,
          items: selectedItems,
          deliveryMode: "COUNTER_PICKUP",
          idempotencyKey:
            typeof crypto.randomUUID === "function"
              ? crypto.randomUUID()
              : `${Date.now()}-${Math.random()}`,
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok)
        throw new Error(payload.error ?? "Unable to place food order.");
      setQuantities({});
      setMessage("Food order confirmed. Wallet balance was updated.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to place food order.",
      );
    } finally {
      setOrdering(false);
    }
  };

  if (loading)
    return (
      <div className="grid min-h-80 place-items-center">
        <LoaderCircle className="size-5 animate-spin" />
      </div>
    );

  return (
    <main className="min-h-screen bg-background px-5 py-8 text-foreground sm:px-6">
      <div className="mx-auto max-w-5xl">
        <p className="inline-flex items-center gap-2 text-sm font-semibold text-secondary">
          <Popcorn className="size-4" aria-hidden="true" />
          Cinema food
        </p>
        <h1 className="mt-2 text-3xl font-semibold">Order for your show</h1>
        {message ? (
          <p className="mt-5 rounded-md border border-secondary/40 bg-secondary/10 p-3 text-sm">
            {message}
          </p>
        ) : null}
        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <article
              key={item._id}
              className="rounded-md border border-border bg-surface p-4"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                {item.category}
              </p>
              <h2 className="mt-2 font-semibold">{item.name}</h2>
              <p className="mt-1 min-h-10 text-sm text-muted">
                {item.description ?? "Fresh cinema counter item."}
              </p>
              <div className="mt-4 flex items-center justify-between gap-3">
                <span className="font-semibold">INR {item.price}</span>
                <input
                  type="number"
                  min="0"
                  max="20"
                  value={quantities[item._id] ?? 0}
                  onChange={(event) =>
                    setQuantities((current) => ({
                      ...current,
                      [item._id]: Math.max(0, Number(event.target.value)),
                    }))
                  }
                  className="h-9 w-20 rounded-md border border-border bg-background px-2 text-sm"
                  aria-label={`${item.name} quantity`}
                />
              </div>
            </article>
          ))}
        </div>
        <div className="sticky bottom-0 mt-7 rounded-md border border-border bg-background/95 p-4 backdrop-blur">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-semibold">Total: INR {total}</p>
            <button
              type="button"
              onClick={() => void order()}
              disabled={!selectedItems.length || ordering}
              className="h-11 rounded-md bg-accent px-5 text-sm font-semibold text-accent-foreground disabled:opacity-45"
            >
              {ordering ? "Ordering..." : "Pay with wallet"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
