"use client";

import { CalendarDays, MapPin, Ticket } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { CinemaChoice, MovieShowtime } from "@/lib/catalog/types";

type ShowtimePickerProps = {
  showtimes: MovieShowtime[];
  cinemaChoices: CinemaChoice[];
};

const unique = (values: string[]) => [...new Set(values)];

export function ShowtimePicker({
  showtimes,
  cinemaChoices,
}: ShowtimePickerProps) {
  const cities = useMemo(
    () =>
      unique(["Kolkata", ...showtimes.map((show) => show.city)]).filter(
        Boolean,
      ),
    [showtimes],
  );
  const [city, setCity] = useState(cities[0] ?? "");
  const cityShowtimes = showtimes.filter((show) => show.city === city);
  const cinemas = unique([
    ...cityShowtimes.map((show) => show.cinema),
    ...(city === "Kolkata" ? cinemaChoices.map((cinema) => cinema.name) : []),
  ]);
  const [cinema, setCinema] = useState(cinemas[0] ?? "");
  const cinemaShowtimes = cityShowtimes.filter(
    (show) => show.cinema === cinema,
  );
  const dates = unique(cinemaShowtimes.map((show) => show.date));
  const [date, setDate] = useState(dates[0] ?? "");
  const selectedShowtimes = cinemaShowtimes.filter(
    (show) => show.date === date,
  );
  const selectedCinema = cinemaChoices.find((choice) => choice.name === cinema);

  const chooseCity = (nextCity: string) => {
    const nextCityShows = showtimes.filter((show) => show.city === nextCity);
    const nextCinema =
      nextCityShows[0]?.cinema ??
      (nextCity === "Kolkata" ? (cinemaChoices[0]?.name ?? "") : "");
    setCity(nextCity);
    setCinema(nextCinema);
    setDate(
      nextCityShows.find((show) => show.cinema === nextCinema)?.date ?? "",
    );
  };

  const chooseCinema = (nextCinema: string) => {
    const nextShows = cityShowtimes.filter(
      (show) => show.cinema === nextCinema,
    );
    setCinema(nextCinema);
    setDate(nextShows[0]?.date ?? "");
  };

  if (!showtimes.length && !cinemaChoices.length) {
    return (
      <p className="rounded-md border border-border bg-surface p-4 text-sm text-muted">
        Showtimes will be announced shortly.
      </p>
    );
  }

  return (
    <section
      id="showtimes"
      className="rounded-md border border-border bg-surface p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-secondary">
            Book at the cinema
          </p>
          <h2 className="mt-1 text-xl font-semibold">Choose a showtime</h2>
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted">
          <Ticket className="size-3.5" aria-hidden="true" />
          Seat selection comes next
        </span>
      </div>

      <div className="mt-6 grid gap-6">
        <div>
          <p className="mb-2 text-sm font-semibold">1. City</p>
          <div className="flex flex-wrap gap-2">
            {cities.map((entry) => (
              <button
                type="button"
                key={entry}
                onClick={() => chooseCity(entry)}
                className={`h-9 rounded-sm border px-3 text-sm font-medium transition-colors ${city === entry ? "border-secondary bg-secondary/15 text-foreground" : "border-border text-muted hover:bg-surface-muted"}`}
              >
                {entry}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold">2. Cinema</p>
            {city === "Kolkata" ? (
              <span className="text-xs text-muted">
                {cinemaChoices.length} halls
              </span>
            ) : null}
          </div>
          <select
            value={cinema}
            onChange={(event) => chooseCinema(event.target.value)}
            className="mt-2 h-11 w-full rounded-sm border border-border bg-background px-3 text-sm font-medium outline-none transition-colors focus:border-secondary"
            aria-label="Choose a cinema"
          >
            {cinemas.map((entry) => {
              const cinemaChoice = cinemaChoices.find(
                (choice) => choice.name === entry,
              );
              return (
                <option key={entry} value={entry}>
                  {entry}
                  {cinemaChoice ? ` — ${cinemaChoice.locality}` : ""}
                </option>
              );
            })}
          </select>
          <p className="mt-2 flex items-start gap-1.5 text-xs leading-5 text-muted">
            <MapPin className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
            {cityShowtimes.find((show) => show.cinema === cinema)
              ?.cinemaAddress ??
              selectedCinema?.address ??
              "Address to be announced"}
          </p>
        </div>

        {cinemaShowtimes.length ? (
          <>
            <div>
              <p className="mb-2 text-sm font-semibold">3. Date</p>
              <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {dates.map((entry) => {
                  const show = cinemaShowtimes.find(
                    (item) => item.date === entry,
                  );
                  return (
                    <button
                      type="button"
                      key={entry}
                      onClick={() => setDate(entry)}
                      className={`min-w-24 rounded-sm border px-3 py-2 text-left text-xs transition-colors ${date === entry ? "border-secondary bg-secondary/15 text-foreground" : "border-border text-muted hover:bg-surface-muted"}`}
                    >
                      <CalendarDays
                        className="mb-1 size-3.5"
                        aria-hidden="true"
                      />
                      {show?.dateLabel}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold">4. Showtime</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {selectedShowtimes.map((show) =>
                  show.availability === "SOLD_OUT" ? (
                    <span
                      key={show.id}
                      className="rounded-sm border border-border bg-surface-muted px-3 py-3 text-sm text-muted"
                    >
                      <span className="font-semibold">{show.time}</span>
                      <span className="ml-2 text-xs">Sold out</span>
                    </span>
                  ) : (
                    <Link
                      key={show.id}
                      href={`/booking?showId=${encodeURIComponent(show.id)}`}
                      className="group flex items-center justify-between rounded-sm border border-primary/55 bg-primary/10 px-3 py-3 text-sm font-semibold transition-colors hover:border-secondary hover:bg-secondary/15"
                    >
                      <span>
                        {show.time}
                        <span className="ml-2 text-xs font-normal text-muted">
                          {show.screen}
                        </span>
                      </span>
                      <span className="text-xs text-secondary">
                        from {"\u20b9"}
                        {show.priceFrom}
                      </span>
                    </Link>
                  ),
                )}
              </div>
            </div>
          </>
        ) : (
          <p className="rounded-sm border border-dashed border-border bg-surface-muted/50 p-3 text-sm leading-6 text-muted">
            No scheduled sessions at this cinema yet. Choose another Kolkata
            cinema or check back once its showtimes are published.
          </p>
        )}
      </div>
    </section>
  );
}
