"use client";

import { ImageUp, LoaderCircle, Plus, Save } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { firebaseAuth } from "@/lib/firebase/client";

type Option = { _id?: string; id?: string; name: string; state?: string };
type OrganizerEvent = {
  _id: string;
  title: string;
  status: string;
  approvalStatus: string;
  eventType: string;
  startsAt: string;
  venue?: { name: string };
  category?: { name: string };
};

const eventTypes = [
  "CONCERT",
  "COMEDY",
  "THEATRE",
  "SPORT",
  "WORKSHOP",
  "FESTIVAL",
  "GAMING",
  "EXHIBITION",
  "KIDS",
  "LOCAL",
  "COLLEGE",
  "ADVENTURE",
  "SPECIAL_EXPERIENCE",
];

export function EventManager({ createOnly = false }: { createOnly?: boolean }) {
  const [events, setEvents] = useState<OrganizerEvent[]>([]);
  const [categories, setCategories] = useState<Option[]>([]);
  const [cities, setCities] = useState<Option[]>([]);
  const [venues, setVenues] = useState<Option[]>([]);
  const [poster, setPoster] = useState("");
  const [banner, setBanner] = useState("");
  const [gallery, setGallery] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  const request = useCallback(async (path: string, init: RequestInit = {}) => {
    const token = await firebaseAuth.currentUser?.getIdToken();
    if (!token) throw new Error("Sign in with an approved organizer account.");
    const response = await fetch(path, {
      ...init,
      headers: { Authorization: `Bearer ${token}`, ...init.headers },
    });
    const payload = (await response.json()) as {
      error?: string;
      events?: OrganizerEvent[];
      categories?: Option[];
      cities?: Option[];
      venues?: Option[];
      secureUrl?: string;
    };
    if (!response.ok) throw new Error(payload.error ?? "Request failed.");
    return payload;
  }, []);

  const load = useCallback(async () => {
    const [eventData, categoryData, cityData, venueData] = await Promise.all([
      request("/api/organizer/events"),
      request("/api/management/categories"),
      request("/api/management/cities"),
      request("/api/management/venues"),
    ]);
    setEvents(eventData.events ?? []);
    setCategories(categoryData.categories ?? []);
    setCities(cityData.cities ?? []);
    setVenues(venueData.venues ?? []);
  }, [request]);

  useEffect(() => {
    const timer = window.setTimeout(
      () =>
        void load().catch((loadError) =>
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load event workspace.",
          ),
        ),
      0,
    );
    return () => window.clearTimeout(timer);
  }, [load]);

  const upload = async (file: File, folder: "events") => {
    const form = new FormData();
    form.set("file", file);
    form.set("folder", folder);
    const result = await request("/api/management/uploads", {
      method: "POST",
      body: form,
    });
    return result.secureUrl ?? "";
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const form = new FormData(event.currentTarget);
      const eventData = {
        title: String(form.get("title")),
        description: String(form.get("description")),
        poster,
        banner: banner || undefined,
        gallery,
        category: String(form.get("category")),
        city: String(form.get("city")),
        venue: String(form.get("venue")),
        eventType: String(form.get("eventType")),
        startsAt: String(form.get("startsAt")),
        endsAt: String(form.get("endsAt")),
        durationMinutes: Number(form.get("durationMinutes")),
        language: String(form.get("language") || "")
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        ageRestriction: String(form.get("ageRestriction") || "All ages"),
        ticketLimit: Number(form.get("ticketLimit") || 10),
      };
      await request("/api/organizer/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(eventData),
      });
      setNotice("Event saved as a draft and submitted for Admin approval.");
      event.currentTarget.reset();
      setPoster("");
      setBanner("");
      setGallery([]);
      await load();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to save event.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-background px-5 py-8 text-foreground sm:px-8">
      <div className="mx-auto max-w-7xl">
        <p className="text-sm font-semibold text-secondary">Organizer events</p>
        <h1 className="mt-2 text-3xl font-semibold">
          Create and manage events
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          Every new event starts in draft status and waits for Admin approval
          before publication. Sessions, VIP pricing, and seat limits are
          configured in Shows & Sessions.
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
        <div
          className={`mt-7 grid gap-8 ${createOnly ? "max-w-3xl" : "xl:grid-cols-[460px_minmax(0,1fr)]"}`}
        >
          <section className="rounded-md border border-border bg-surface p-5">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Plus className="size-5 text-secondary" /> New event
            </h2>
            <form onSubmit={submit} className="mt-5 grid gap-3">
              <Field label="Event name" name="title" required />
              <label className="grid gap-1.5 text-sm font-medium">
                Description
                <textarea
                  name="description"
                  minLength={20}
                  required
                  className="min-h-28 rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <Select
                  label="Category"
                  name="category"
                  options={categories}
                  required
                />
                <Select label="City" name="city" options={cities} required />
                <Select label="Venue" name="venue" options={venues} required />
                <Select
                  label="Event type"
                  name="eventType"
                  options={eventTypes.map((name) => ({ name }))}
                  required
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  label="Starts"
                  name="startsAt"
                  type="datetime-local"
                  required
                />
                <Field
                  label="Ends"
                  name="endsAt"
                  type="datetime-local"
                  required
                />
                <Field
                  label="Duration (minutes)"
                  name="durationMinutes"
                  type="number"
                  min="1"
                />
                <Field
                  label="Ticket limit"
                  name="ticketLimit"
                  type="number"
                  min="1"
                  defaultValue="10"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  label="Languages"
                  name="language"
                  placeholder="English, Hindi"
                />
                <Field
                  label="Age restriction"
                  name="ageRestriction"
                  defaultValue="All ages"
                />
              </div>
              <Upload
                label="Poster"
                value={poster}
                onChange={(value) => setPoster(value)}
                upload={upload}
                required
              />
              <Upload
                label="Banner"
                value={banner}
                onChange={(value) => setBanner(value)}
                upload={upload}
              />
              <button
                type="submit"
                disabled={saving || !poster}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {saving ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                {saving ? "Saving..." : "Save draft"}
              </button>
            </form>
          </section>
          {!createOnly ? (
            <section>
              <h2 className="text-lg font-semibold">Your events</h2>
              <div className="mt-4 grid gap-3">
                {events.length ? (
                  events.map((item) => (
                    <article
                      key={item._id}
                      className="rounded-md border border-border bg-surface p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold text-secondary">
                            {item.eventType}
                          </p>
                          <h3 className="mt-1 font-semibold">{item.title}</h3>
                          <p className="mt-1 text-sm text-muted">
                            {item.venue?.name ?? "Venue pending"} ·{" "}
                            {new Date(item.startsAt).toLocaleString("en-IN")}
                          </p>
                        </div>
                        <div className="flex gap-2 text-[11px] font-semibold">
                          <span className="rounded-sm bg-surface-muted px-2 py-1">
                            {item.status}
                          </span>
                          <span className="rounded-sm bg-warning/15 px-2 py-1 text-warning">
                            Approval: {item.approvalStatus}
                          </span>
                        </div>
                      </div>
                    </article>
                  ))
                ) : (
                  <p className="rounded-md border border-dashed border-border p-5 text-sm text-muted">
                    No events yet.
                  </p>
                )}
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </main>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  min,
  defaultValue,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  min?: string;
  defaultValue?: string;
  placeholder?: string;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-medium">
      {label}
      <input
        name={name}
        type={type}
        required={required}
        min={min}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="h-10 rounded-md border border-border bg-background px-3 text-sm font-normal"
      />
    </label>
  );
}

function Select({
  label,
  name,
  options,
  required,
}: {
  label: string;
  name: string;
  options: Option[];
  required?: boolean;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-medium">
      {label}
      <select
        name={name}
        required={required}
        defaultValue=""
        className="h-10 rounded-md border border-border bg-background px-3 text-sm font-normal"
      >
        <option value="" disabled>
          Select {label.toLowerCase()}
        </option>
        {options.map((option) => (
          <option
            key={option._id ?? option.id ?? option.name}
            value={option._id ?? option.id}
          >
            {option.name}
            {option.state ? `, ${option.state}` : ""}
          </option>
        ))}
      </select>
    </label>
  );
}

function Upload({
  label,
  value,
  onChange,
  upload,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  upload: (file: File, folder: "events") => Promise<string>;
  required?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  return (
    <label className="grid gap-1.5 text-sm font-medium">
      {label}
      {value ? (
        <span className="truncate text-xs text-secondary">
          Uploaded: {value}
        </span>
      ) : null}
      <span className="flex h-10 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm text-muted">
        <ImageUp className="size-4" />
        {loading ? "Uploading..." : "Choose image"}
        <input
          type="file"
          accept="image/*"
          required={required && !value}
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            setLoading(true);
            setError("");
            try {
              onChange(await upload(file, "events"));
            } catch (uploadError) {
              setError(
                uploadError instanceof Error
                  ? uploadError.message
                  : "Upload failed.",
              );
            } finally {
              setLoading(false);
            }
          }}
          className="sr-only"
        />
      </span>
      {error ? <span className="text-xs text-accent">{error}</span> : null}
    </label>
  );
}
