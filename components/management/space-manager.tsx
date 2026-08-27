"use client";

import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Building2,
  ImageUp,
  LoaderCircle,
  Plus,
  Rows3,
  Trash2,
} from "lucide-react";
import { firebaseAuth } from "@/lib/firebase/client";

type ManagementRole = "ADMIN" | "ORGANIZER";
type City = { _id?: string; id?: string; name: string; state: string };
type Organizer = { _id: string; organizationName: string };
type Venue = {
  _id: string;
  name: string;
  address: string;
  capacity: number;
  venueType: string;
  approvalStatus: string;
  operationalStatus?: "ACTIVE" | "INACTIVE" | "MAINTENANCE";
  city?: { name: string; state: string };
};
type Cinema = {
  _id: string;
  name: string;
  address: string;
  chain?: string;
  city?: { name: string; state: string };
};
type Screen = {
  _id: string;
  name: string;
  capacity: number;
  cinema?: { name: string };
  venue?: { name: string };
  seatCategories: string[];
};
type Tab = "venues" | "cinemas" | "screens";
type SeatRow = {
  label: string;
  seatCount: number;
  category: "REGULAR" | "PREMIUM" | "RECLINER" | "VIP";
};

const categories: SeatRow["category"][] = [
  "REGULAR",
  "PREMIUM",
  "RECLINER",
  "VIP",
];
const venueTypes = [
  "AUDITORIUM",
  "ARENA",
  "CLUB",
  "OPEN_AIR",
  "STADIUM",
  "THEATRE",
  "OTHER",
];

export function SpaceManager({ role }: { role: ManagementRole }) {
  const [tab, setTab] = useState<Tab>("venues");
  const [cities, setCities] = useState<City[]>([]);
  const [organizers, setOrganizers] = useState<Organizer[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [cinemas, setCinemas] = useState<Cinema[]>([]);
  const [screens, setScreens] = useState<Screen[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [venueImage, setVenueImage] = useState<File | null>(null);
  const [rows, setRows] = useState<SeatRow[]>([
    { label: "A", seatCount: 12, category: "REGULAR" },
  ]);

  const canManageCinemas = role === "ADMIN";
  const canManageScreens = role === "ADMIN";
  const totalSeats = useMemo(
    () => rows.reduce((total, row) => total + Number(row.seatCount || 0), 0),
    [rows],
  );

  const request = useCallback(async (path: string, init: RequestInit = {}) => {
    const user = firebaseAuth.currentUser;
    if (!user)
      throw new Error(
        "Sign in with your approved management account to use this workspace.",
      );
    const token = await user.getIdToken();
    const response = await fetch(path, {
      ...init,
      headers: { Authorization: `Bearer ${token}`, ...(init.headers ?? {}) },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "Request failed.");
    return data;
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [cityData, venueData, cinemaData, screenData, organizerData] =
        await Promise.all([
          request("/api/management/cities"),
          request("/api/management/venues"),
          request("/api/management/cinemas"),
          request("/api/management/screens"),
          role === "ADMIN"
            ? request("/api/management/organizers")
            : Promise.resolve({ organizers: [] }),
        ]);
      setCities(cityData.cities ?? []);
      setVenues(venueData.venues ?? []);
      setCinemas(cinemaData.cinemas ?? []);
      setScreens(screenData.screens ?? []);
      setOrganizers(organizerData.organizers ?? []);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load spaces.",
      );
    } finally {
      setLoading(false);
    }
  }, [request, role]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const cityOptions = cities.map((city) => ({
    id: city.id ?? city._id ?? "",
    label: `${city.name}, ${city.state}`,
  }));

  const submitVenue = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const form = new FormData(event.currentTarget);
      const images: string[] = [];
      if (venueImage) {
        const upload = new FormData();
        upload.set("file", venueImage);
        const uploadResult = await request("/api/management/uploads", {
          method: "POST",
          body: upload,
        });
        images.push(uploadResult.secureUrl);
      }
      await request("/api/management/venues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          address: form.get("address"),
          city: form.get("city"),
          capacity: Number(form.get("capacity")),
          venueType: form.get("venueType"),
          parkingAvailable: form.get("parkingAvailable") === "on",
          seatingType: form.get("seatingType"),
          assignedOrganizer: form.get("assignedOrganizer") || undefined,
          amenities: String(form.get("amenities") ?? "")
            .split(",")
            .map((entry) => entry.trim())
            .filter(Boolean),
          contact: {
            name: form.get("contactName"),
            email: form.get("contactEmail"),
            phone: form.get("contactPhone"),
          },
          images,
        }),
      });
      event.currentTarget.reset();
      setVenueImage(null);
      setNotice(
        role === "ADMIN"
          ? "Venue created."
          : "Venue submitted for admin approval.",
      );
      await load();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to create venue.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const submitCinema = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const form = new FormData(event.currentTarget);
      await request("/api/management/cinemas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          address: form.get("address"),
          city: form.get("city"),
          chain: form.get("chain"),
          amenities: String(form.get("amenities") ?? "")
            .split(",")
            .map((entry) => entry.trim())
            .filter(Boolean),
          contact: {
            name: form.get("contactName"),
            email: form.get("contactEmail"),
            phone: form.get("contactPhone"),
          },
        }),
      });
      event.currentTarget.reset();
      setNotice("Cinema created.");
      await load();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to create cinema.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const submitScreen = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const form = new FormData(event.currentTarget);
      await request("/api/management/screens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          cinema: form.get("cinema"),
          rows,
        }),
      });
      event.currentTarget.reset();
      setRows([{ label: "A", seatCount: 12, category: "REGULAR" }]);
      setNotice("Screen and seat layout created.");
      await load();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to create screen.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const archive = async (
    kind: "venues" | "cinemas" | "screens",
    id: string,
  ) => {
    if (
      !window.confirm("Archive this space? Existing shows will not be deleted.")
    )
      return;
    try {
      await request(`/api/management/${kind}/${id}`, { method: "DELETE" });
      setNotice("Space archived.");
      await load();
    } catch (archiveError) {
      setError(
        archiveError instanceof Error
          ? archiveError.message
          : "Unable to archive this space.",
      );
    }
  };

  const updateVenueStatus = async (
    id: string,
    operationalStatus: "ACTIVE" | "INACTIVE" | "MAINTENANCE",
  ) => {
    try {
      await request(`/api/management/venues/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operationalStatus,
          active: operationalStatus === "ACTIVE",
        }),
      });
      setNotice("Venue status updated.");
      await load();
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Unable to update venue status.",
      );
    }
  };

  return (
    <main className="min-h-screen bg-background px-5 py-8 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <p className="text-sm font-semibold text-secondary">
          {role === "ADMIN" ? "Admin management" : "Organizer management"}
        </p>
        <h1 className="mt-2 text-3xl font-semibold">
          Venues, cinemas and screens
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          Create the spaces your show records need. Seat layouts are generated
          from the row setup below and are ready for Stage C seat selection.
        </p>

        <div className="mt-6 flex gap-2 overflow-x-auto border-b border-border pb-px">
          {(["venues", "cinemas", "screens"] as Tab[]).map((entry) => (
            <button
              type="button"
              key={entry}
              onClick={() => setTab(entry)}
              className={`whitespace-nowrap border-b-2 px-3 py-3 text-sm font-semibold capitalize transition-colors ${tab === entry ? "border-secondary text-foreground" : "border-transparent text-muted hover:text-foreground"}`}
            >
              {entry}
            </button>
          ))}
        </div>

        {error ? (
          <div className="mt-5 rounded-md border border-accent/50 bg-accent/10 p-3 text-sm text-foreground">
            {error}
          </div>
        ) : null}
        {notice ? (
          <div className="mt-5 rounded-md border border-secondary/40 bg-secondary/10 p-3 text-sm text-foreground">
            {notice}
          </div>
        ) : null}
        {loading ? (
          <div className="mt-8 flex items-center gap-2 text-sm text-muted">
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
            Loading management data...
          </div>
        ) : null}

        {!loading && tab === "venues" ? (
          <div className="mt-6 grid gap-7 xl:grid-cols-[390px_minmax(0,1fr)]">
            <section className="rounded-md border border-border bg-surface p-5">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <Building2
                  className="size-5 text-secondary"
                  aria-hidden="true"
                />
                Add venue
              </h2>
              <form onSubmit={submitVenue} className="mt-5 grid gap-3">
                <Field label="Venue name" name="name" required />
                <Field label="Address" name="address" required />
                <SelectField
                  label="City"
                  name="city"
                  options={cityOptions}
                  required
                />
                <Field
                  label="Capacity"
                  name="capacity"
                  type="number"
                  min="1"
                  required
                />
                <SelectField
                  label="Venue type"
                  name="venueType"
                  options={venueTypes.map((value) => ({
                    id: value,
                    label: value.replaceAll("_", " "),
                  }))}
                  required
                />
                <SelectField
                  label="Seating type"
                  name="seatingType"
                  options={[
                    { id: "FIXED", label: "Fixed seating" },
                    { id: "FLEXIBLE", label: "Flexible seating" },
                    { id: "STANDING", label: "Standing" },
                    { id: "MIXED", label: "Mixed" },
                  ]}
                  required
                />
                <label className="flex items-center gap-2 rounded-sm border border-border bg-background px-3 py-2 text-sm text-muted">
                  <input name="parkingAvailable" type="checkbox" />
                  Parking available
                </label>
                {role === "ADMIN" ? (
                  <SelectField
                    label="Assigned organizer"
                    name="assignedOrganizer"
                    options={organizers.map((organizer) => ({
                      id: organizer._id,
                      label: organizer.organizationName,
                    }))}
                  />
                ) : null}
                <Field
                  label="Amenities"
                  name="amenities"
                  placeholder="Parking, Accessible entry"
                />
                <Field label="Contact name" name="contactName" />
                <Field label="Contact email" name="contactEmail" type="email" />
                <Field label="Contact phone" name="contactPhone" />
                <label className="grid gap-1.5 text-sm font-medium">
                  Venue image{" "}
                  <span className="flex h-10 items-center gap-2 rounded-sm border border-border bg-background px-3 text-sm text-muted">
                    <ImageUp className="size-4" aria-hidden="true" />
                    {venueImage?.name ?? "Choose image"}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) =>
                        setVenueImage(event.target.files?.[0] ?? null)
                      }
                      className="sr-only"
                    />
                  </span>
                </label>
                <SubmitButton
                  label={role === "ADMIN" ? "Create venue" : "Submit venue"}
                  pending={submitting}
                />
              </form>
            </section>
            <SpaceList
              title="Venues"
              empty="No venues available yet."
              items={venues.map((venue) => ({
                id: venue._id,
                title: venue.name,
                detail: `${venue.city?.name ?? "Unknown city"} - ${venue.capacity} seats - ${venue.venueType.replaceAll("_", " ")}`,
                status: `${venue.approvalStatus} · ${venue.operationalStatus ?? "ACTIVE"}`,
              }))}
              onStatusChange={
                role === "ADMIN"
                  ? (id, status) =>
                      void updateVenueStatus(
                        id,
                        status as "ACTIVE" | "INACTIVE" | "MAINTENANCE",
                      )
                  : undefined
              }
              onArchive={
                role === "ADMIN" ? (id) => archive("venues", id) : undefined
              }
            />
          </div>
        ) : null}

        {!loading && tab === "cinemas" ? (
          <div className="mt-6 grid gap-7 xl:grid-cols-[390px_minmax(0,1fr)]">
            {canManageCinemas ? (
              <section className="rounded-md border border-border bg-surface p-5">
                <h2 className="flex items-center gap-2 text-lg font-semibold">
                  <Building2
                    className="size-5 text-secondary"
                    aria-hidden="true"
                  />
                  Add cinema
                </h2>
                <form onSubmit={submitCinema} className="mt-5 grid gap-3">
                  <Field label="Cinema name" name="name" required />
                  <Field label="Location / address" name="address" required />
                  <SelectField
                    label="City"
                    name="city"
                    options={cityOptions}
                    required
                  />
                  <Field label="Cinema chain" name="chain" />
                  <Field
                    label="Amenities"
                    name="amenities"
                    placeholder="Dolby Atmos, Food court"
                  />
                  <Field label="Contact name" name="contactName" />
                  <Field
                    label="Contact email"
                    name="contactEmail"
                    type="email"
                  />
                  <Field label="Contact phone" name="contactPhone" />
                  <SubmitButton label="Create cinema" pending={submitting} />
                </form>
              </section>
            ) : (
              <ReadOnlyNote text="Cinemas are managed by admins. You can choose an approved cinema when scheduling movie shows." />
            )}
            <SpaceList
              title="Cinemas"
              empty="No cinemas available yet."
              items={cinemas.map((cinema) => ({
                id: cinema._id,
                title: cinema.name,
                detail: `${cinema.city?.name ?? "Unknown city"}${cinema.chain ? ` - ${cinema.chain}` : ""}`,
              }))}
              onArchive={
                role === "ADMIN" ? (id) => archive("cinemas", id) : undefined
              }
            />
          </div>
        ) : null}

        {!loading && tab === "screens" ? (
          <div className="mt-6 grid gap-7 xl:grid-cols-[470px_minmax(0,1fr)]">
            {canManageScreens ? (
              <section className="rounded-md border border-border bg-surface p-5">
                <h2 className="flex items-center gap-2 text-lg font-semibold">
                  <Rows3 className="size-5 text-secondary" aria-hidden="true" />
                  Add screen and seat layout
                </h2>
                <form onSubmit={submitScreen} className="mt-5 grid gap-4">
                  <Field label="Screen name" name="name" required />
                  <SelectField
                    label="Cinema"
                    name="cinema"
                    options={cinemas.map((cinema) => ({
                      id: cinema._id,
                      label: `${cinema.name} - ${cinema.city?.name ?? ""}`,
                    }))}
                    required
                  />
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-medium">Seat rows</span>
                      <button
                        type="button"
                        onClick={() =>
                          setRows((current) => [
                            ...current,
                            {
                              label: String.fromCharCode(65 + current.length),
                              seatCount: 12,
                              category: "REGULAR",
                            },
                          ])
                        }
                        className="inline-flex items-center gap-1 text-xs font-semibold text-secondary"
                      >
                        <Plus className="size-3.5" aria-hidden="true" />
                        Add row
                      </button>
                    </div>
                    <div className="grid gap-2">
                      {rows.map((row, index) => (
                        <div
                          key={`${row.label}-${index}`}
                          className="grid grid-cols-[68px_1fr_1fr_auto] gap-2"
                        >
                          <input
                            value={row.label}
                            onChange={(event) =>
                              setRows((current) =>
                                current.map((entry, rowIndex) =>
                                  rowIndex === index
                                    ? { ...entry, label: event.target.value }
                                    : entry,
                                ),
                              )
                            }
                            className="h-10 min-w-0 rounded-sm border border-border bg-background px-2 text-sm"
                            aria-label={`Row ${index + 1} label`}
                          />
                          <input
                            type="number"
                            min="1"
                            max="80"
                            value={row.seatCount}
                            onChange={(event) =>
                              setRows((current) =>
                                current.map((entry, rowIndex) =>
                                  rowIndex === index
                                    ? {
                                        ...entry,
                                        seatCount: Number(event.target.value),
                                      }
                                    : entry,
                                ),
                              )
                            }
                            className="h-10 min-w-0 rounded-sm border border-border bg-background px-2 text-sm"
                            aria-label={`Row ${row.label} seats`}
                          />
                          <select
                            value={row.category}
                            onChange={(event) =>
                              setRows((current) =>
                                current.map((entry, rowIndex) =>
                                  rowIndex === index
                                    ? {
                                        ...entry,
                                        category: event.target
                                          .value as SeatRow["category"],
                                      }
                                    : entry,
                                ),
                              )
                            }
                            className="h-10 min-w-0 rounded-sm border border-border bg-background px-2 text-sm"
                            aria-label={`Row ${row.label} category`}
                          >
                            {categories.map((category) => (
                              <option key={category} value={category}>
                                {category}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() =>
                              setRows((current) =>
                                current.filter(
                                  (_, rowIndex) => rowIndex !== index,
                                ),
                              )
                            }
                            disabled={rows.length === 1}
                            className="grid size-10 place-items-center rounded-sm border border-border text-muted hover:text-accent disabled:opacity-40"
                            aria-label={`Remove row ${row.label}`}
                          >
                            <Trash2 className="size-4" aria-hidden="true" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-muted">
                      {totalSeats} total seats. Categories are saved with the
                      seat layout.
                    </p>
                  </div>
                  <SubmitButton label="Create screen" pending={submitting} />
                </form>
              </section>
            ) : (
              <ReadOnlyNote text="Screens and seat layouts are managed by admins. Their layouts will be available during show scheduling." />
            )}
            <SpaceList
              title="Screens"
              empty="No screens available yet."
              items={screens.map((screen) => ({
                id: screen._id,
                title: screen.name,
                detail: `${screen.cinema?.name ?? screen.venue?.name ?? "Unassigned"} - ${screen.capacity} seats - ${screen.seatCategories.join(", ")}`,
              }))}
              onArchive={
                role === "ADMIN" ? (id) => archive("screens", id) : undefined
              }
            />
          </div>
        ) : null}
      </div>
    </main>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  placeholder,
  min,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  min?: string;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-medium">
      {label}
      <input
        name={name}
        type={type}
        min={min}
        required={required}
        placeholder={placeholder}
        className="h-10 rounded-sm border border-border bg-background px-3 text-sm font-normal outline-none placeholder:text-muted"
      />
    </label>
  );
}

function SelectField({
  label,
  name,
  options,
  required,
}: {
  label: string;
  name: string;
  options: Array<{ id: string; label: string }>;
  required?: boolean;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-medium">
      {label}
      <select
        name={name}
        required={required}
        defaultValue=""
        className="h-10 rounded-sm border border-border bg-background px-3 text-sm font-normal outline-none"
      >
        <option value="" disabled>
          {options.length
            ? `Select ${label.toLowerCase()}`
            : "No records available"}
        </option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function SubmitButton({ label, pending }: { label: string; pending: boolean }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-2 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-accent disabled:opacity-60"
    >
      {pending ? (
        <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
      ) : null}
      {pending ? "Saving..." : label}
    </button>
  );
}

function ReadOnlyNote({ text }: { text: string }) {
  return (
    <section className="rounded-md border border-border bg-surface p-5 text-sm leading-6 text-muted">
      {text}
    </section>
  );
}

function SpaceList({
  title,
  empty,
  items,
  onArchive,
  onStatusChange,
}: {
  title: string;
  empty: string;
  items: Array<{ id: string; title: string; detail: string; status?: string }>;
  onArchive?: (id: string) => void;
  onStatusChange?: (id: string, status: string) => void;
}) {
  return (
    <section>
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-4 grid gap-3">
        {items.length ? (
          items.map((item) => (
            <article
              key={item.id}
              className="flex items-center justify-between gap-4 rounded-md border border-border bg-surface p-4"
            >
              <div className="min-w-0">
                <h3 className="truncate text-sm font-semibold">{item.title}</h3>
                <p className="mt-1 text-xs text-muted">{item.detail}</p>
                {item.status ? (
                  <span
                    className={`mt-2 inline-flex rounded-sm px-2 py-1 text-[11px] font-semibold ${item.status === "APPROVED" ? "bg-secondary/15 text-secondary" : "bg-warning/15 text-warning"}`}
                  >
                    {item.status}
                  </span>
                ) : null}
              </div>
              {onArchive ? (
                <button
                  type="button"
                  onClick={() => onArchive(item.id)}
                  className="grid size-9 shrink-0 place-items-center rounded-sm border border-border text-muted transition-colors hover:border-accent hover:text-accent"
                  aria-label={`Archive ${item.title}`}
                  title="Archive"
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              ) : null}
              {onStatusChange ? (
                <select
                  value={item.status?.split(" · ")[1] ?? "ACTIVE"}
                  onChange={(event) =>
                    onStatusChange(item.id, event.target.value)
                  }
                  className="h-9 rounded-sm border border-border bg-background px-2 text-xs"
                  aria-label={`Set ${item.title} status`}
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="MAINTENANCE">Maintenance</option>
                </select>
              ) : null}
            </article>
          ))
        ) : (
          <p className="rounded-md border border-dashed border-border p-5 text-sm text-muted">
            {empty}
          </p>
        )}
      </div>
    </section>
  );
}
