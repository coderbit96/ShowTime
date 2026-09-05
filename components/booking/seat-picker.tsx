"use client";

import {
  type ComponentProps,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { LoaderCircle, RefreshCw, Ticket } from "lucide-react";
import { useRouter } from "next/navigation";
import { SeatMotion } from "@/components/motion";
import { firebaseAuth } from "@/lib/firebase/client";

type SeatStatus = "AVAILABLE" | "LOCKED" | "BOOKED" | "BLOCKED";
type Seat = {
  id: string;
  row: string;
  number: number;
  category: string;
  status: SeatStatus;
};
type SeatRow = { label: string; seats: Seat[] };
type ActiveSeatLock = { id: string; seatIds: string[]; expiresAt: string };
type SeatResponse = {
  show: {
    id: string;
    pricing: Array<{ category: string; price: number }>;
    bookingLimits: { maxSeatsPerBooking: number; maxBookings?: number };
    bookingStatus: string;
  };
  layout: { categories: string[]; totalSeats: number; rows: SeatRow[] };
  lock: ActiveSeatLock | null;
  updatedAt: string;
};

const statusLabels: Record<SeatStatus | "SELECTED", string> = {
  AVAILABLE: "Available",
  SELECTED: "Selected",
  LOCKED: "Locked",
  BOOKED: "Booked",
  BLOCKED: "Blocked",
};

const statusClasses: Record<SeatStatus | "SELECTED", string> = {
  AVAILABLE:
    "border-slate-100/85 bg-slate-100 text-slate-950 shadow-[inset_0_-3px_0_rgba(15,23,42,0.3),0_2px_0_rgba(255,255,255,0.12)] hover:border-secondary hover:bg-secondary hover:text-secondary-foreground",
  SELECTED:
    "border-primary bg-primary text-primary-foreground shadow-[inset_0_-3px_0_rgba(6,35,43,0.32),0_0_18px_rgba(6,182,212,0.42)]",
  LOCKED:
    "cursor-not-allowed border-violet-300/60 bg-violet-100 text-violet-700",
  BOOKED:
    "cursor-not-allowed border-accent/55 bg-accent/30 text-accent-foreground/70",
  BLOCKED:
    "cursor-not-allowed border-border bg-background text-muted/45 line-through",
};

function splitSeatBlocks(seats: Seat[]) {
  if (seats.length <= 3) return [seats];
  const sideBlockSize = Math.max(1, Math.floor(seats.length / 4));
  return [
    seats.slice(0, sideBlockSize),
    seats.slice(sideBlockSize, seats.length - sideBlockSize),
    seats.slice(seats.length - sideBlockSize),
  ].filter((block) => block.length);
}

export function SeatPicker({
  showId,
  initialNotice = "",
  groupId,
}: {
  showId: string;
  initialNotice?: string;
  groupId?: string;
}) {
  const router = useRouter();
  const [data, setData] = useState<SeatResponse | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(initialNotice);
  const [seatLock, setSeatLock] = useState<ActiveSeatLock | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null);
  const [locking, setLocking] = useState(false);
  const [releasing, setReleasing] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  const load = useCallback(
    async (quiet = false) => {
      if (!quiet) setLoading(true);
      else setRefreshing(true);
      try {
        const token = await firebaseAuth.currentUser?.getIdToken();
        const response = await fetch(
          `/api/shows/${encodeURIComponent(showId)}/seats`,
          {
            cache: "no-store",
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          },
        );
        const payload = (await response.json()) as SeatResponse & {
          error?: string;
        };
        if (!response.ok)
          throw new Error(payload.error ?? "Unable to load seat availability.");
        setData(payload);
        setSeatLock(payload.lock);
        setSelected((current) => {
          const available = new Set(
            payload.layout.rows.flatMap((row) =>
              row.seats
                .filter((seat) => seat.status === "AVAILABLE")
                .map((seat) => seat.id),
            ),
          );
          const requested = payload.lock?.seatIds ?? current;
          const next = requested.filter((seatId) => available.has(seatId));
          if (next.length !== current.length)
            setNotice(
              "A selected seat is no longer available and was removed.",
            );
          return next;
        });
        setError("");
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load seat availability.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [showId],
  );

  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      void load();
    }, 0);
    const poll = window.setInterval(() => {
      void load(true);
    }, 3000);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(poll);
    };
  }, [load]);

  useEffect(() => {
    if (!seatLock) return;
    const updateRemaining = () => {
      const seconds = Math.max(
        0,
        Math.ceil((new Date(seatLock.expiresAt).getTime() - Date.now()) / 1000),
      );
      setRemainingSeconds(seconds);
      if (seconds === 0) {
        setSeatLock(null);
        setSelected([]);
        setIdempotencyKey(null);
        setNotice("Your seat hold expired. Choose seats again.");
        void load(true);
      }
    };
    const initialUpdate = window.setTimeout(updateRemaining, 0);
    const interval = window.setInterval(updateRemaining, 1000);
    return () => {
      window.clearTimeout(initialUpdate);
      window.clearInterval(interval);
    };
  }, [load, seatLock]);

  const seatLookup = useMemo(
    () =>
      new Map(
        data?.layout.rows.flatMap((row) =>
          row.seats.map((seat) => [seat.id, seat]),
        ) ?? [],
      ),
    [data],
  );
  const priceLookup = useMemo(
    () =>
      new Map(
        data?.show.pricing.map((price) => [price.category, price.price]) ?? [],
      ),
    [data],
  );
  const selectedSeats = selected
    .map((seatId) => seatLookup.get(seatId))
    .filter((seat): seat is Seat => Boolean(seat));
  const total = selectedSeats.reduce(
    (sum, seat) => sum + (priceLookup.get(seat.category) ?? 0),
    0,
  );

  const toggleSeat = (seat: Seat) => {
    if (seat.status !== "AVAILABLE" || !data) return;
    if (seatLock) {
      setNotice("Release your current hold before changing seats.");
      return;
    }
    setNotice("");
    setIdempotencyKey(null);
    setSelected((current) => {
      if (current.includes(seat.id))
        return current.filter((seatId) => seatId !== seat.id);
      if (current.length >= data.show.bookingLimits.maxSeatsPerBooking) {
        setNotice(
          `You can select up to ${data.show.bookingLimits.maxSeatsPerBooking} seats for this show.`,
        );
        return current;
      }
      return [...current, seat.id];
    });
  };

  const lockSeats = async () => {
    if (!selected.length || !data || locking) return;
    const token = await firebaseAuth.currentUser?.getIdToken();
    if (!token) {
      setError("Sign in to lock seats.");
      return;
    }
    const requestKey =
      idempotencyKey ??
      (typeof crypto?.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`);
    setIdempotencyKey(requestKey);
    setLocking(true);
    setError("");
    try {
      const response = await fetch(
        `/api/shows/${encodeURIComponent(showId)}/locks`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            seatIds: selected,
            idempotencyKey: requestKey,
          }),
        },
      );
      const payload = (await response.json()) as {
        lock?: ActiveSeatLock;
        error?: string;
      };
      if (!response.ok)
        throw new Error(payload.error ?? "Unable to lock the selected seats.");
      if (!payload.lock)
        throw new Error("The seat hold response was incomplete.");
      setSeatLock(payload.lock);
      setNotice("Seats are held. Complete payment before the timer expires.");
      const groupQuery = groupId
        ? `&groupId=${encodeURIComponent(groupId)}`
        : "";
      router.push(
        `/booking/summary?showId=${encodeURIComponent(showId)}&lockId=${encodeURIComponent(payload.lock.id)}${groupQuery}`,
      );
    } catch (lockError) {
      setError(
        lockError instanceof Error
          ? lockError.message
          : "Unable to lock the selected seats.",
      );
      void load(true);
    } finally {
      setLocking(false);
    }
  };

  const releaseSeats = async () => {
    if (!seatLock || releasing) return;
    const token = await firebaseAuth.currentUser?.getIdToken();
    if (!token) {
      setError("Sign in to release seats.");
      return;
    }
    setReleasing(true);
    setError("");
    try {
      const response = await fetch(
        `/api/shows/${encodeURIComponent(showId)}/locks`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ lockId: seatLock.id }),
        },
      );
      const payload = (await response.json()) as { error?: string };
      if (!response.ok)
        throw new Error(payload.error ?? "Unable to release the seat hold.");
      setSeatLock(null);
      setSelected([]);
      setIdempotencyKey(null);
      setNotice("Your seat hold was released.");
      void load(true);
    } catch (releaseError) {
      setError(
        releaseError instanceof Error
          ? releaseError.message
          : "Unable to release the seat hold.",
      );
    } finally {
      setReleasing(false);
    }
  };

  if (loading && !data)
    return (
      <div className="grid min-h-80 place-items-center rounded-md border border-border bg-surface text-sm text-muted">
        <span className="inline-flex items-center gap-2">
          <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          Loading seat map...
        </span>
      </div>
    );
  if (error && !data)
    return (
      <div className="rounded-md border border-accent/50 bg-accent/10 p-5 text-sm text-foreground">
        {error}
      </div>
    );
  if (!data) return null;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      <section className="overflow-hidden rounded-xl border border-border bg-surface p-4 shadow-[0_20px_55px_rgba(15,23,42,0.1)] sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-secondary">
              Seat selection
            </p>
            <h1 className="mt-1 text-2xl font-semibold">Choose your seats</h1>
          </div>
          <button
            type="button"
            onClick={() => void load(true)}
            className="inline-flex h-11 items-center gap-2 rounded-sm border border-border px-3 text-xs font-semibold text-muted transition-colors hover:bg-surface-muted hover:text-foreground"
            disabled={refreshing}
          >
            <RefreshCw
              className={`size-3.5 ${refreshing ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
            Refresh
          </button>
        </div>
        <div className="mt-5 flex flex-wrap gap-2 text-xs text-muted">
          {(
            ["AVAILABLE", "SELECTED", "LOCKED", "BOOKED", "BLOCKED"] as const
          ).map((status) => (
            <span
              key={status}
              className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-background/60 px-2.5 py-1.5"
            >
              <span
                className={`size-3 rounded-[3px] border ${statusClasses[status]}`}
                aria-hidden="true"
              />
              {statusLabels[status]}
            </span>
          ))}
        </div>
        {notice ? (
          <p className="mt-4 rounded-sm border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-foreground">
            {notice}
          </p>
        ) : null}
        {error ? (
          <p className="mt-4 rounded-sm border border-accent/50 bg-accent/10 px-3 py-2 text-sm text-foreground">
            {error}
          </p>
        ) : null}

        <p className="mt-6 text-xs leading-5 text-muted sm:hidden">
          Swipe the auditorium map sideways to choose a seat.
        </p>
        <div className="relative mt-4 overflow-x-auto overscroll-x-contain pb-4 [scrollbar-width:thin] sm:mt-8">
          <div className="relative min-w-[720px] px-7 pb-5 pt-3 sm:min-w-[820px] sm:px-12">
            <div className="relative mx-auto max-w-[780px]">
              <div className="h-3 rounded-t-[100%] bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 shadow-[0_5px_22px_rgba(249,115,22,0.35)]" />
              <p className="absolute inset-x-0 -top-0.5 text-center text-[10px] font-bold tracking-[0.16em] text-slate-950">
                SCREEN
              </p>
            </div>
            <div className="pointer-events-none absolute bottom-5 left-2 top-20 w-3 border-x border-border/70 bg-surface-muted/70" />
            <div className="pointer-events-none absolute bottom-5 right-2 top-20 w-3 border-x border-border/70 bg-surface-muted/70" />
            <div className="relative mt-12 space-y-8 px-5 sm:px-10">
              {data.layout.categories.map((category) => {
                const rows = data.layout.rows.filter((row) =>
                  row.seats.some((seat) => seat.category === category),
                );
                if (!rows.length) return null;
                const price = priceLookup.get(category);
                return (
                  <section key={category} aria-label={`${category} seats`}>
                    <div className="mb-3 flex items-center gap-3">
                      <span className="h-px flex-1 bg-border/70" />
                      <h2 className="rounded-full border border-border bg-background px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
                        {category}
                        {price !== undefined ? ` · ₹${price}` : ""}
                      </h2>
                      <span className="h-px flex-1 bg-border/70" />
                    </div>
                    <div className="grid gap-2.5">
                      {rows.map((row) => (
                        <div
                          key={row.label}
                          className="grid grid-cols-[28px_minmax(0,1fr)_28px] items-center gap-2"
                        >
                          <span className="text-center text-xs font-bold text-muted">
                            {row.label}
                          </span>
                          <div className="grid grid-flow-col auto-cols-max justify-center gap-x-8 sm:gap-x-14">
                            {splitSeatBlocks(row.seats).map((block, index) => (
                              <div
                                key={`${row.label}-${index}`}
                                className="flex gap-1.5"
                              >
                                {block.map((seat) => (
                                  <SeatButton
                                    key={seat.id}
                                    seat={seat}
                                    selected={selected.includes(seat.id)}
                                    onClick={() => toggleSeat(seat)}
                                  />
                                ))}
                              </div>
                            ))}
                          </div>
                          <span className="text-center text-xs font-bold text-muted">
                            {row.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <aside className="lg:sticky lg:top-20 lg:self-start">
        <section className="rounded-md border border-border bg-surface p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-secondary">
            Your selection
          </p>
          <div className="mt-4 min-h-24">
            {selectedSeats.length ? (
              <div className="grid gap-2">
                {selectedSeats.map((seat) => (
                  <div
                    key={seat.id}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <span className="font-semibold">
                      {seat.id}
                      <span className="ml-2 text-xs font-normal text-muted">
                        {seat.category}
                      </span>
                    </span>
                    <span className="text-muted">
                      {"\u20b9"}
                      {priceLookup.get(seat.category) ?? 0}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm leading-6 text-muted">
                Select available seats to see your total.
              </p>
            )}
          </div>
          <div className="mt-5 border-t border-border pt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">Total</span>
              <span className="text-xl font-semibold">
                {"\u20b9"}
                {total}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted">
              {selectedSeats.length} of{" "}
              {data.show.bookingLimits.maxSeatsPerBooking} seats selected
            </p>
            {seatLock ? (
              <div className="mt-5 grid gap-3">
                <div className="rounded-sm border border-secondary/40 bg-secondary/10 px-3 py-2 text-center">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-secondary">
                    Seats held
                  </p>
                  <p className="mt-1 text-lg font-semibold tabular-nums">
                    {formatCountdown(remainingSeconds)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void releaseSeats()}
                  disabled={releasing}
                  className="inline-flex h-11 w-full items-center justify-center rounded-md border border-border px-4 text-sm font-semibold text-muted transition-colors hover:bg-surface-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {releasing ? "Releasing seats..." : "Release seats"}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => void lockSeats()}
                disabled={!selectedSeats.length || locking}
                className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-cta px-4 text-sm font-semibold text-cta-foreground transition-colors hover:bg-cta-hover disabled:cursor-not-allowed disabled:opacity-45"
              >
                <Ticket className="size-4" aria-hidden="true" />
                {locking ? "Locking seats..." : "Continue"}
              </button>
            )}
          </div>
        </section>
      </aside>
    </div>
  );
}

function formatCountdown(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

function SeatButton({
  seat,
  selected,
  ...props
}: { seat: Seat; selected: boolean } & ComponentProps<typeof SeatMotion>) {
  const state =
    selected && seat.status === "AVAILABLE" ? "SELECTED" : seat.status;
  if (seat.status !== "AVAILABLE")
    return (
      <span
        className={`grid size-11 place-items-center rounded-[5px_5px_3px_3px] border text-[10px] font-bold sm:size-10 ${statusClasses[state]}`}
        title={statusLabels[state]}
      >
        {String(seat.number).padStart(2, "0")}
      </span>
    );
  return (
    <SeatMotion
      type="button"
      aria-label={`${seat.id}, ${statusLabels[state]}`}
      aria-pressed={selected}
      className={`grid size-11 place-items-center rounded-[5px_5px_3px_3px] border text-[10px] font-bold sm:size-10 ${statusClasses[state]}`}
      title={statusLabels[state]}
      animate={{ scale: selected ? 1.06 : 1, y: selected ? -1 : 0 }}
      {...props}
    >
      {String(seat.number).padStart(2, "0")}
    </SeatMotion>
  );
}
