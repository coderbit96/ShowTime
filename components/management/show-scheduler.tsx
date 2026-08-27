"use client";

import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { CalendarPlus, LoaderCircle, Ticket, Trash2 } from "lucide-react";
import { firebaseAuth } from "@/lib/firebase/client";

type Role = "ADMIN" | "ORGANIZER";
type ContentType = "EVENT" | "MOVIE";
type EventOption = {
  id: string;
  title: string;
  venueId?: string;
  venueName?: string;
};
type MovieOption = { id: string; title: string };
type ScreenOption = {
  id: string;
  name: string;
  cinemaId?: string;
  cinemaName?: string;
  venueId?: string;
  venueName?: string;
  categories: string[];
  capacity: number;
};
type ScheduledShow = {
  _id: string;
  contentType: ContentType;
  startTime: string;
  endTime: string;
  bookingStatus: string;
  movie?: { title: string };
  event?: { title: string };
  screen?: { name: string };
  cinema?: { name: string };
  venue?: { name: string };
};

export function ShowScheduler({ role }: { role: Role }) {
  const [contentType, setContentType] = useState<ContentType>("EVENT");
  const [events, setEvents] = useState<EventOption[]>([]);
  const [movies, setMovies] = useState<MovieOption[]>([]);
  const [screens, setScreens] = useState<ScreenOption[]>([]);
  const [shows, setShows] = useState<ScheduledShow[]>([]);
  const [contentId, setContentId] = useState("");
  const [screenId, setScreenId] = useState("");
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const request = useCallback(async (path: string, init: RequestInit = {}) => {
    const user = firebaseAuth.currentUser;
    if (!user)
      throw new Error(
        "Sign in with an approved management account to schedule a show.",
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
      const [options, showData] = await Promise.all([
        request("/api/management/scheduling-options"),
        request("/api/management/shows"),
      ]);
      setEvents(options.events ?? []);
      setMovies(options.movies ?? []);
      setScreens(options.screens ?? []);
      setShows(showData.shows ?? []);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load scheduling data.",
      );
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const selectedEvent = events.find((event) => event.id === contentId);
  const availableScreens = useMemo(
    () =>
      contentType === "EVENT"
        ? screens.filter(
            (screen) =>
              !selectedEvent || screen.venueId === selectedEvent.venueId,
          )
        : screens.filter((screen) => Boolean(screen.cinemaId)),
    [contentType, screens, selectedEvent],
  );
  const selectedScreen = screens.find((screen) => screen.id === screenId);

  const changeContentType = (nextType: ContentType) => {
    setContentType(nextType);
    setContentId("");
    setScreenId("");
    setPrices({});
  };
  const changeScreen = (nextScreenId: string) => {
    const screen = screens.find((entry) => entry.id === nextScreenId);
    setScreenId(nextScreenId);
    setPrices(
      Object.fromEntries(
        (screen?.categories ?? []).map((category) => [category, ""]),
      ),
    );
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const form = new FormData(event.currentTarget);
      if (!selectedScreen) throw new Error("Choose a screen.");
      const pricing = selectedScreen.categories.map((category) => ({
        category,
        price: Number(prices[category]),
        currency: "INR",
      }));
      await request("/api/management/shows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentType,
          movie: contentType === "MOVIE" ? contentId : undefined,
          event: contentType === "EVENT" ? contentId : undefined,
          cinema: contentType === "MOVIE" ? selectedScreen.cinemaId : undefined,
          venue: contentType === "EVENT" ? selectedEvent?.venueId : undefined,
          screen: screenId,
          startTime: form.get("startTime"),
          endTime: form.get("endTime"),
          bookingOpensAt: form.get("bookingOpensAt") || undefined,
          bookingClosesAt: form.get("bookingClosesAt") || undefined,
          pricing,
          bookingLimits: {
            maxSeatsPerBooking: Number(form.get("maxSeatsPerBooking")),
            ...(form.get("maxBookings")
              ? { maxBookings: Number(form.get("maxBookings")) }
              : {}),
          },
        }),
      });
      setNotice("Show scheduled and seat availability snapshot created.");
      event.currentTarget.reset();
      setContentId("");
      setScreenId("");
      setPrices({});
      await load();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to schedule show.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const cancelShow = async (id: string) => {
    if (!window.confirm("Cancel this scheduled show?")) return;
    try {
      await request(`/api/management/shows/${id}`, { method: "DELETE" });
      setNotice("Show cancelled.");
      await load();
    } catch (cancelError) {
      setError(
        cancelError instanceof Error
          ? cancelError.message
          : "Unable to cancel show.",
      );
    }
  };

  return (
    <main className="min-h-screen bg-background px-5 py-8 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <p className="text-sm font-semibold text-secondary">
          {role === "ADMIN" ? "Admin scheduling" : "Organizer scheduling"}
        </p>
        <h1 className="mt-2 text-3xl font-semibold">Schedule bookable shows</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          Each show creates its own seat availability snapshot from the selected
          screen. Time conflicts on the same screen are rejected.
        </p>
        {error ? (
          <div className="mt-5 rounded-md border border-accent/50 bg-accent/10 p-3 text-sm">
            {error}
          </div>
        ) : null}
        {notice ? (
          <div className="mt-5 rounded-md border border-secondary/40 bg-secondary/10 p-3 text-sm">
            {notice}
          </div>
        ) : null}
        {loading ? (
          <div className="mt-7 flex items-center gap-2 text-sm text-muted">
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
            Loading scheduling data...
          </div>
        ) : (
          <div className="mt-7 grid gap-8 xl:grid-cols-[440px_minmax(0,1fr)]">
            <section className="rounded-md border border-border bg-surface p-5">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <CalendarPlus
                  className="size-5 text-secondary"
                  aria-hidden="true"
                />
                New show
              </h2>
              <form onSubmit={submit} className="mt-5 grid gap-4">
                <label className="grid gap-1.5 text-sm font-medium">
                  Content type
                  <select
                    value={contentType}
                    onChange={(event) =>
                      changeContentType(event.target.value as ContentType)
                    }
                    className="h-10 rounded-sm border border-border bg-background px-3 text-sm font-normal"
                  >
                    <option value="EVENT">Event</option>
                    {role === "ADMIN" ? (
                      <option value="MOVIE">Movie</option>
                    ) : null}
                  </select>
                </label>
                <label className="grid gap-1.5 text-sm font-medium">
                  {contentType === "EVENT" ? "Event" : "Movie"}
                  <select
                    value={contentId}
                    onChange={(event) => {
                      setContentId(event.target.value);
                      setScreenId("");
                      setPrices({});
                    }}
                    required
                    className="h-10 rounded-sm border border-border bg-background px-3 text-sm font-normal"
                  >
                    <option value="" disabled>
                      Select {contentType.toLowerCase()}
                    </option>
                    {(contentType === "EVENT" ? events : movies).map(
                      (entry) => (
                        <option key={entry.id} value={entry.id}>
                          {entry.title}
                        </option>
                      ),
                    )}
                  </select>
                </label>
                {contentType === "EVENT" && selectedEvent ? (
                  <p className="rounded-sm bg-surface-muted px-3 py-2 text-xs text-muted">
                    Venue: {selectedEvent.venueName ?? "Not configured"}
                  </p>
                ) : null}
                <label className="grid gap-1.5 text-sm font-medium">
                  Screen
                  <select
                    value={screenId}
                    onChange={(event) => changeScreen(event.target.value)}
                    required
                    disabled={!contentId}
                    className="h-10 rounded-sm border border-border bg-background px-3 text-sm font-normal disabled:opacity-50"
                  >
                    <option value="" disabled>
                      Select screen
                    </option>
                    {availableScreens.map((screen) => (
                      <option key={screen.id} value={screen.id}>
                        {screen.name} - {screen.cinemaName ?? screen.venueName}{" "}
                        ({screen.capacity} seats)
                      </option>
                    ))}
                  </select>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Start time"
                    name="startTime"
                    type="datetime-local"
                    required
                  />
                  <Input
                    label="End time"
                    name="endTime"
                    type="datetime-local"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Booking opens"
                    name="bookingOpensAt"
                    type="datetime-local"
                  />
                  <Input
                    label="Booking closes"
                    name="bookingClosesAt"
                    type="datetime-local"
                  />
                </div>
                <div>
                  <p className="mb-2 text-sm font-medium">Ticket pricing</p>
                  {selectedScreen ? (
                    <div className="grid gap-2">
                      {selectedScreen.categories.map((category) => (
                        <label
                          key={category}
                          className="grid grid-cols-[1fr_110px] items-center gap-3 rounded-sm border border-border bg-background px-3 py-2 text-sm font-medium"
                        >
                          <span>{category}</span>
                          <input
                            type="number"
                            min="0"
                            required
                            value={prices[category] ?? ""}
                            onChange={(event) =>
                              setPrices((current) => ({
                                ...current,
                                [category]: event.target.value,
                              }))
                            }
                            placeholder="Price"
                            className="h-8 rounded-sm border border-border bg-surface px-2 text-sm font-normal"
                          />
                        </label>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted">
                      Select a screen to configure each seat category.
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Max seats per booking"
                    name="maxSeatsPerBooking"
                    type="number"
                    min="1"
                    defaultValue="10"
                    required
                  />
                  <Input
                    label="Max bookings"
                    name="maxBookings"
                    type="number"
                    min="1"
                    placeholder="Optional"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting || !selectedScreen}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-accent disabled:opacity-60"
                >
                  {submitting ? (
                    <LoaderCircle
                      className="size-4 animate-spin"
                      aria-hidden="true"
                    />
                  ) : (
                    <Ticket className="size-4" aria-hidden="true" />
                  )}
                  {submitting ? "Scheduling..." : "Create show"}
                </button>
              </form>
            </section>
            <section>
              <h2 className="text-lg font-semibold">Scheduled shows</h2>
              <div className="mt-4 grid gap-3">
                {shows.length ? (
                  shows.map((show) => (
                    <article
                      key={show._id}
                      className="flex items-center justify-between gap-4 rounded-md border border-border bg-surface p-4"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-secondary">
                          {show.contentType}
                        </p>
                        <h3 className="mt-1 truncate text-sm font-semibold">
                          {show.event?.title ??
                            show.movie?.title ??
                            "Untitled show"}
                        </h3>
                        <p className="mt-1 text-xs text-muted">
                          {new Intl.DateTimeFormat("en-IN", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          }).format(new Date(show.startTime))}{" "}
                          - {show.screen?.name} at{" "}
                          {show.venue?.name ?? show.cinema?.name}
                        </p>
                        <span className="mt-2 inline-flex rounded-sm bg-surface-muted px-2 py-1 text-[11px] font-semibold text-muted">
                          {show.bookingStatus}
                        </span>
                      </div>
                      {show.bookingStatus === "SCHEDULED" ? (
                        <button
                          type="button"
                          onClick={() => cancelShow(show._id)}
                          className="grid size-9 shrink-0 place-items-center rounded-sm border border-border text-muted hover:border-accent hover:text-accent"
                          aria-label="Cancel show"
                          title="Cancel show"
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                        </button>
                      ) : null}
                    </article>
                  ))
                ) : (
                  <p className="rounded-md border border-dashed border-border p-5 text-sm text-muted">
                    No shows scheduled yet.
                  </p>
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}

function Input({
  label,
  name,
  type,
  required,
  min,
  defaultValue,
  placeholder,
}: {
  label: string;
  name: string;
  type: string;
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
        className="h-10 rounded-sm border border-border bg-background px-3 text-sm font-normal"
      />
    </label>
  );
}
