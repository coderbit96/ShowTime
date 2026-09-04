"use client";

import { LoaderCircle, Pencil, Power, Star } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { firebaseAuth } from "@/lib/firebase/client";

type Category = {
  _id: string;
  name: string;
  description?: string;
  icon?: string;
  image?: string;
  parent?: string;
  sortOrder: number;
  active: boolean;
};
type City = {
  _id: string;
  name: string;
  state: string;
  country: string;
  image?: string;
  aliases: string[];
  featured: boolean;
  active: boolean;
};

export function CatalogManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [tab, setTab] = useState<"categories" | "cities">("categories");
  const [editing, setEditing] = useState<Category | City | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const request = useCallback(async (path: string, init: RequestInit = {}) => {
    const token = await firebaseAuth.currentUser?.getIdToken();
    if (!token) throw new Error("Sign in as an Admin.");
    const response = await fetch(path, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...init.headers,
      },
    });
    const payload = (await response.json()) as {
      error?: string;
      categories?: Category[];
      cities?: City[];
    };
    if (!response.ok) throw new Error(payload.error ?? "Request failed.");
    return payload;
  }, []);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [categoryData, cityData] = await Promise.all([
        request("/api/management/categories"),
        request("/api/admin/catalog/cities"),
      ]);
      setCategories(categoryData.categories ?? []);
      setCities(cityData.cities ?? []);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load catalog data.",
      );
    } finally {
      setLoading(false);
    }
  }, [request]);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  const submitCategory = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const current = editing as Category | null;
    try {
      const payload = {
        name: String(form.get("name") ?? ""),
        description: String(form.get("description") ?? "") || undefined,
        icon: String(form.get("icon") ?? "") || undefined,
        image: String(form.get("image") ?? ""),
        parent: String(form.get("parent") ?? "") || null,
        sortOrder: Number(form.get("sortOrder") ?? 0),
        active: form.get("active") === "on",
      };
      await request(
        current
          ? `/api/management/categories/${current._id}`
          : "/api/management/categories",
        { method: current ? "PATCH" : "POST", body: JSON.stringify(payload) },
      );
      event.currentTarget.reset();
      setEditing(null);
      setNotice(current ? "Category updated." : "Category created.");
      await load();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to save category.",
      );
    }
  };
  const submitCity = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const current = editing as City | null;
    try {
      const payload = {
        name: String(form.get("name") ?? ""),
        state: String(form.get("state") ?? ""),
        country: String(form.get("country") ?? "India"),
        image: String(form.get("image") ?? ""),
        aliases: String(form.get("aliases") ?? "")
          .split(",")
          .map((alias) => alias.trim())
          .filter(Boolean),
        featured: form.get("featured") === "on",
        active: form.get("active") === "on",
      };
      await request(
        current
          ? `/api/admin/catalog/cities/${current._id}`
          : "/api/admin/catalog/cities",
        { method: current ? "PATCH" : "POST", body: JSON.stringify(payload) },
      );
      event.currentTarget.reset();
      setEditing(null);
      setNotice(current ? "City updated." : "City created.");
      await load();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to save city.",
      );
    }
  };
  const toggle = async (
    kind: "categories" | "cities",
    item: Category | City,
    key: "active" | "featured",
  ) => {
    try {
      const currentValue =
        key === "featured" ? (item as City).featured : item.active;
      await request(
        kind === "categories"
          ? `/api/management/categories/${item._id}`
          : `/api/admin/catalog/cities/${item._id}`,
        { method: "PATCH", body: JSON.stringify({ [key]: !currentValue }) },
      );
      await load();
    } catch (toggleError) {
      setError(
        toggleError instanceof Error
          ? toggleError.message
          : "Unable to update catalog item.",
      );
    }
  };
  const category = editing && "sortOrder" in editing ? editing : null;
  const city = editing && "state" in editing ? editing : null;
  return (
    <section className="mx-auto max-w-7xl px-5 pt-8 text-foreground sm:px-8">
      <p className="text-sm font-semibold text-secondary">Admin catalog</p>
      <h1 className="mt-2 text-3xl font-semibold">Categories and cities</h1>
      <p className="mt-2 text-sm text-muted">
        Only active cities are exposed to customer search and management
        selections.
      </p>
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
      <div className="mt-6 flex gap-2 border-b border-border">
        <button
          onClick={() => {
            setTab("categories");
            setEditing(null);
          }}
          className={`border-b-2 px-3 py-2 text-sm font-semibold ${tab === "categories" ? "border-secondary" : "border-transparent text-muted"}`}
        >
          Categories
        </button>
        <button
          onClick={() => {
            setTab("cities");
            setEditing(null);
          }}
          className={`border-b-2 px-3 py-2 text-sm font-semibold ${tab === "cities" ? "border-secondary" : "border-transparent text-muted"}`}
        >
          Cities
        </button>
      </div>
      {loading ? (
        <div className="grid min-h-48 place-items-center">
          <LoaderCircle className="size-5 animate-spin" />
        </div>
      ) : (
        <div className="mt-6 grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          {tab === "categories" ? (
            <>
              <form
                onSubmit={submitCategory}
                className="grid h-fit gap-3 rounded-lg border border-border bg-surface p-5"
              >
                <h2 className="font-semibold">
                  {category ? "Edit category" : "Add category"}
                </h2>
                <Input
                  label="Name"
                  name="name"
                  required
                  defaultValue={category?.name}
                />
                <Input
                  label="Description"
                  name="description"
                  defaultValue={category?.description}
                />
                <Input
                  label="Icon name or URL"
                  name="icon"
                  defaultValue={category?.icon}
                />
                <Input
                  label="Image URL"
                  name="image"
                  defaultValue={category?.image}
                />
                <label className="grid gap-1 text-sm">
                  Parent category
                  <select
                    name="parent"
                    defaultValue={category?.parent ?? ""}
                    className="h-10 rounded-md border border-border bg-background px-3"
                  >
                    <option value="">None (top level)</option>
                    {categories
                      .filter((item) => item._id !== category?._id)
                      .map((item) => (
                        <option key={item._id} value={item._id}>
                          {item.name}
                        </option>
                      ))}
                  </select>
                </label>
                <Input
                  label="Display order"
                  name="sortOrder"
                  type="number"
                  min="0"
                  defaultValue={String(category?.sortOrder ?? 0)}
                />
                <Toggle
                  name="active"
                  label="Active"
                  defaultChecked={category?.active ?? true}
                />
                <button className="h-10 rounded-md bg-primary text-sm font-semibold text-primary-foreground">
                  {category ? "Save category" : "Create category"}
                </button>
              </form>
              <CatalogList
                items={categories}
                type="categories"
                onEdit={setEditing}
                onToggle={toggle}
              />
            </>
          ) : (
            <>
              <form
                onSubmit={submitCity}
                className="grid h-fit gap-3 rounded-lg border border-border bg-surface p-5"
              >
                <h2 className="font-semibold">
                  {city ? "Edit city" : "Add city"}
                </h2>
                <Input
                  label="City name"
                  name="name"
                  required
                  defaultValue={city?.name}
                />
                <Input
                  label="State"
                  name="state"
                  required
                  defaultValue={city?.state}
                />
                <Input
                  label="Country"
                  name="country"
                  required
                  defaultValue={city?.country ?? "India"}
                />
                <Input
                  label="City image URL"
                  name="image"
                  defaultValue={city?.image}
                />
                <Input
                  label="Search aliases"
                  name="aliases"
                  placeholder="Calcutta, Kolkata City"
                  defaultValue={city?.aliases.join(", ")}
                />
                <Toggle
                  name="featured"
                  label="Featured city"
                  defaultChecked={city?.featured ?? false}
                />
                <Toggle
                  name="active"
                  label="Active for customers"
                  defaultChecked={city?.active ?? true}
                />
                <button className="h-10 rounded-md bg-primary text-sm font-semibold text-primary-foreground">
                  {city ? "Save city" : "Create city"}
                </button>
              </form>
              <CatalogList
                items={cities}
                type="cities"
                onEdit={setEditing}
                onToggle={toggle}
              />
            </>
          )}
        </div>
      )}
    </section>
  );
}
function Input({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="grid gap-1 text-sm">
      {label}
      <input
        {...props}
        className="h-10 rounded-md border border-border bg-background px-3"
      />
    </label>
  );
}
function Toggle({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm">
      <input type="checkbox" {...props} />
      {label}
    </label>
  );
}
function CatalogList({
  items,
  type,
  onEdit,
  onToggle,
}: {
  items: Array<Category | City>;
  type: "categories" | "cities";
  onEdit: (item: Category | City) => void;
  onToggle: (
    kind: "categories" | "cities",
    item: Category | City,
    key: "active" | "featured",
  ) => void;
}) {
  return (
    <div className="grid gap-3">
      {items.length ? (
        items.map((item) => (
          <article
            key={item._id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface p-4"
          >
            <div>
              <p className="font-semibold">{item.name}</p>
              <p className="mt-1 text-sm text-muted">
                {"state" in item
                  ? `${item.state}, ${item.country}${item.aliases.length ? ` · ${item.aliases.join(", ")}` : ""}`
                  : `${item.description ?? "No description"} · Order ${item.sortOrder}`}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onEdit(item)}
                className="grid size-9 place-items-center rounded-md border border-border text-muted"
              >
                <Pencil className="size-4" />
              </button>
              {type === "cities" ? (
                <button
                  onClick={() => onToggle(type, item, "featured")}
                  className={`grid size-9 place-items-center rounded-md border ${"featured" in item && item.featured ? "border-warning text-warning" : "border-border text-muted"}`}
                >
                  <Star className="size-4" />
                </button>
              ) : null}
              <button
                onClick={() => onToggle(type, item, "active")}
                className={`grid size-9 place-items-center rounded-md border ${item.active ? "border-secondary text-secondary" : "border-border text-muted"}`}
              >
                <Power className="size-4" />
              </button>
            </div>
          </article>
        ))
      ) : (
        <p className="rounded-md border border-dashed border-border p-5 text-sm text-muted">
          No {type} yet.
        </p>
      )}
    </div>
  );
}
