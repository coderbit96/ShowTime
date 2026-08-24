"use client";

import { LoaderCircle, Plus, Ticket } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { firebaseAuth } from "@/lib/firebase/client";

type Coupon = {
  _id: string;
  code: string;
  discountType: string;
  discountValue: number;
  expiryDate: string;
  active: boolean;
  usedCount: number;
  flashSaleActive?: boolean;
  flashSaleEndsAt?: string;
};

export function CouponManager() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const request = useCallback(async (init: RequestInit = {}) => {
    const token = await firebaseAuth.currentUser?.getIdToken();
    if (!token) throw new Error("Sign in as an Admin.");
    const response = await fetch("/api/admin/coupons", {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...init.headers,
      },
    });
    const payload = (await response.json()) as {
      error?: string;
      coupons?: Coupon[];
    };
    if (!response.ok) throw new Error(payload.error ?? "Request failed.");
    return payload;
  }, []);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      setCoupons((await request()).coupons ?? []);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load coupons.",
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
    const form = new FormData(event.currentTarget);
    try {
      await request({
        method: "POST",
        body: JSON.stringify({
          code: form.get("code"),
          discountType: form.get("discountType"),
          discountValue: Number(form.get("discountValue")),
          minimumCartAmount: Number(form.get("minimumCartAmount")),
          startDate: form.get("startDate"),
          expiryDate: form.get("expiryDate"),
          usageLimit: Number(form.get("usageLimit")),
          perUserLimit: Number(form.get("perUserLimit")),
          flashSaleActive: form.get("flashSaleActive") === "on",
          flashSaleLabel: form.get("flashSaleLabel") || undefined,
          flashSaleHeadline: form.get("flashSaleHeadline") || undefined,
          flashSaleEndsAt: form.get("flashSaleEndsAt") || undefined,
        }),
      });
      event.currentTarget.reset();
      await load();
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Unable to create coupon.",
      );
    }
  };
  return (
    <main className="min-h-screen bg-background px-5 py-8 text-foreground">
      <div className="mx-auto max-w-5xl">
        <p className="text-sm font-semibold text-secondary">Admin marketing</p>
        <h1 className="mt-2 text-3xl font-semibold">Coupons and promotions</h1>
        {error ? (
          <p className="mt-5 rounded-md border border-accent/50 bg-accent/10 p-3 text-sm">
            {error}
          </p>
        ) : null}
        <div className="mt-7 grid gap-8 lg:grid-cols-[360px_1fr]">
          <form
            onSubmit={create}
            className="grid h-fit gap-3 rounded-md border border-border bg-surface p-5"
          >
            <h2 className="flex items-center gap-2 font-semibold">
              <Plus className="size-4 text-secondary" /> Create coupon
            </h2>
            <input
              name="code"
              required
              placeholder="CODE"
              className="h-10 rounded-md border border-border bg-background px-3 text-sm uppercase"
            />
            <select
              name="discountType"
              className="h-10 rounded-md border border-border bg-background px-3 text-sm"
            >
              <option value="FIXED">Fixed amount</option>
              <option value="PERCENTAGE">Percentage</option>
            </select>
            <input
              name="discountValue"
              required
              type="number"
              min="0"
              placeholder="Discount value"
              className="h-10 rounded-md border border-border bg-background px-3 text-sm"
            />
            <input
              name="minimumCartAmount"
              required
              type="number"
              min="0"
              placeholder="Minimum cart amount"
              className="h-10 rounded-md border border-border bg-background px-3 text-sm"
            />
            <input
              name="startDate"
              required
              type="datetime-local"
              className="h-10 rounded-md border border-border bg-background px-3 text-sm"
            />
            <input
              name="expiryDate"
              required
              type="datetime-local"
              className="h-10 rounded-md border border-border bg-background px-3 text-sm"
            />
            <input
              name="usageLimit"
              required
              type="number"
              min="1"
              placeholder="Usage limit"
              className="h-10 rounded-md border border-border bg-background px-3 text-sm"
            />
            <input
              name="perUserLimit"
              required
              type="number"
              min="1"
              defaultValue="1"
              placeholder="Per-user limit"
              className="h-10 rounded-md border border-border bg-background px-3 text-sm"
            />
            <label className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm text-muted">
              <input
                name="flashSaleActive"
                type="checkbox"
                className="size-4 accent-accent"
              />
              Promote as flash sale
            </label>
            <input
              name="flashSaleLabel"
              placeholder="Flash sale label"
              className="h-10 rounded-md border border-border bg-background px-3 text-sm"
            />
            <input
              name="flashSaleHeadline"
              placeholder="Flash sale headline"
              className="h-10 rounded-md border border-border bg-background px-3 text-sm"
            />
            <input
              name="flashSaleEndsAt"
              type="datetime-local"
              className="h-10 rounded-md border border-border bg-background px-3 text-sm"
            />
            <button className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary text-sm font-semibold text-primary-foreground">
              <Ticket className="size-4" /> Save coupon
            </button>
          </form>
          <section>
            <h2 className="text-lg font-semibold">Active campaigns</h2>
            {loading ? (
              <div className="grid min-h-48 place-items-center">
                <LoaderCircle className="size-5 animate-spin" />
              </div>
            ) : (
              <div className="mt-4 grid gap-3">
                {coupons.map((coupon) => (
                  <article
                    key={coupon._id}
                    className="flex items-center justify-between rounded-md border border-border bg-surface p-4"
                  >
                    <div>
                      <p className="font-semibold">{coupon.code}</p>
                      <p className="mt-1 text-sm text-muted">
                        {coupon.discountType === "FIXED"
                          ? `INR ${coupon.discountValue}`
                          : `${coupon.discountValue}%`}{" "}
                        · used {coupon.usedCount}
                      </p>
                    </div>
                    <span className="text-xs text-muted">
                      Until{" "}
                      {new Date(coupon.expiryDate).toLocaleDateString("en-IN")}
                    </span>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
