"use client";

import { LoaderCircle, Plus, Power, Ticket } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { firebaseAuth } from "@/lib/firebase/client";

type Coupon = {
  _id: string;
  code: string;
  discountType: string;
  discountValue: number;
  maximumDiscount?: number;
  minimumCartAmount: number;
  expiryDate: string;
  active: boolean;
  usedCount: number;
  usageLimit: number;
  perUserLimit: number;
  newUserOnly?: boolean;
  applicableEvents?: string[];
  applicableMovies?: string[];
  applicableOrganizers?: string[];
  applicableCities?: string[];
  flashSaleActive?: boolean;
  flashSaleEndsAt?: string;
};
type Target = {
  _id: string;
  title?: string;
  name?: string;
  organizationName?: string;
};
type Targeting = {
  events: Target[];
  movies: Target[];
  organizers: Target[];
  cities: Target[];
};

export function CouponManager() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [targeting, setTargeting] = useState<Targeting>({
    events: [],
    movies: [],
    organizers: [],
    cities: [],
  });
  const [selected, setSelected] = useState<Record<keyof Targeting, string[]>>({
    events: [],
    movies: [],
    organizers: [],
    cities: [],
  });
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
      targeting?: Targeting;
    };
    if (!response.ok) throw new Error(payload.error ?? "Request failed.");
    return payload;
  }, []);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await request();
      setCoupons(result.coupons ?? []);
      setTargeting(
        result.targeting ?? {
          events: [],
          movies: [],
          organizers: [],
          cities: [],
        },
      );
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
          maximumDiscount: form.get("maximumDiscount")
            ? Number(form.get("maximumDiscount"))
            : undefined,
          applicableEvents: selected.events,
          applicableMovies: selected.movies,
          applicableOrganizers: selected.organizers,
          applicableCities: selected.cities,
          newUserOnly: form.get("newUserOnly") === "on",
          active: form.get("active") === "on",
          flashSaleActive: form.get("flashSaleActive") === "on",
          flashSaleLabel: form.get("flashSaleLabel") || undefined,
          flashSaleHeadline: form.get("flashSaleHeadline") || undefined,
          flashSaleEndsAt: form.get("flashSaleEndsAt") || undefined,
        }),
      });
      event.currentTarget.reset();
      setSelected({ events: [], movies: [], organizers: [], cities: [] });
      await load();
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Unable to create coupon.",
      );
    }
  };
  const toggle = async (coupon: Coupon) => {
    try {
      const token = await firebaseAuth.currentUser?.getIdToken();
      if (!token) throw new Error("Sign in as an Admin.");
      const response = await fetch(`/api/admin/coupons/${coupon._id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ active: !coupon.active }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok)
        throw new Error(payload.error ?? "Unable to update coupon.");
      await load();
    } catch (toggleError) {
      setError(
        toggleError instanceof Error
          ? toggleError.message
          : "Unable to update coupon.",
      );
    }
  };
  const updateTargets = (key: keyof Targeting, values: string[]) =>
    setSelected((current) => ({ ...current, [key]: values }));
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
              name="maximumDiscount"
              type="number"
              min="0"
              placeholder="Maximum discount (percentage only)"
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
            <fieldset className="grid gap-3 rounded-md border border-border bg-background p-3">
              <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-muted">
                Coupon targeting (optional)
              </legend>
              <TargetSelect
                label="Events"
                options={targeting.events}
                selected={selected.events}
                onChange={(values) => updateTargets("events", values)}
              />
              <TargetSelect
                label="Movies"
                options={targeting.movies}
                selected={selected.movies}
                onChange={(values) => updateTargets("movies", values)}
              />
              <TargetSelect
                label="Organizers"
                options={targeting.organizers}
                selected={selected.organizers}
                onChange={(values) => updateTargets("organizers", values)}
              />
              <TargetSelect
                label="Cities"
                options={targeting.cities}
                selected={selected.cities}
                onChange={(values) => updateTargets("cities", values)}
              />
            </fieldset>
            <label className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm text-muted">
              <input
                name="newUserOnly"
                type="checkbox"
                className="size-4 accent-accent"
              />
              New customers only
            </label>
            <label className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm text-muted">
              <input
                name="active"
                type="checkbox"
                defaultChecked
                className="size-4 accent-secondary"
              />
              Activate coupon immediately
            </label>
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
                    className="flex flex-wrap items-center justify-between gap-4 rounded-md border border-border bg-surface p-4"
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
                    <button
                      type="button"
                      onClick={() => void toggle(coupon)}
                      className={`inline-flex h-9 items-center gap-1 rounded-md border px-3 text-xs font-semibold ${coupon.active ? "border-secondary/50 text-secondary" : "border-border text-muted"}`}
                    >
                      <Power className="size-3.5" />{" "}
                      {coupon.active ? "Active" : "Inactive"}
                    </button>
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

function TargetSelect({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: Target[];
  selected: string[];
  onChange: (values: string[]) => void;
}) {
  return (
    <label className="grid gap-1 text-xs font-medium text-muted">
      {label}
      <select
        multiple
        value={selected}
        onChange={(event) =>
          onChange(
            Array.from(
              event.currentTarget.selectedOptions,
              (option) => option.value,
            ),
          )
        }
        className="min-h-20 rounded-md border border-border bg-surface px-2 py-1 text-sm text-foreground"
      >
        {options.map((option) => (
          <option key={option._id} value={option._id}>
            {option.title ??
              option.organizationName ??
              option.name ??
              option._id}
          </option>
        ))}
      </select>
    </label>
  );
}
