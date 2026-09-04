"use client";

import type { ReactNode } from "react";
import { Filter, RotateCcw } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { DateScope } from "@/lib/search";

const cities = ["Kolkata", "Mumbai", "Delhi", "Bengaluru", "Pune"];
const categories = [
  "Movie",
  "Live Event",
  "Concert",
  "Comedy",
  "Sports",
  "Experience",
];
const eventTypes = [
  "MOVIE",
  "CONCERT",
  "COMEDY",
  "THEATRE",
  "SPORT",
  "WORKSHOP",
  "FESTIVAL",
  "GAMING",
];
const languages = ["Hindi", "English", "Tamil", "Telugu", "Bengali"];
const genres = ["Drama", "Comedy", "Romance", "Music", "Adventure", "Sci-fi"];
const priceBuckets = [
  ["under-299", "Under Rs. 299"],
  ["300-599", "Rs. 300-599"],
  ["600-999", "Rs. 600-999"],
  ["1000-plus", "Rs. 1000+"],
] as const;
const dateOptions: Array<[DateScope, string]> = [
  ["today", "Today"],
  ["tomorrow", "Tomorrow"],
  ["weekend", "This weekend"],
  ["custom", "Custom date"],
];

function FilterGroup({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <fieldset className="border-t border-white/10 pt-4 first:border-0 first:pt-0">
      <legend className="mb-3 text-sm font-semibold text-foreground">
        {title}
      </legend>
      <div className="grid gap-2">{children}</div>
    </fieldset>
  );
}

export function SearchFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeCount = Array.from(searchParams.keys()).filter(
    (key) => key !== "q" && key !== "page",
  ).length;

  const updateParams = (mutate: (params: URLSearchParams) => void) => {
    const next = new URLSearchParams(searchParams.toString());
    next.delete("page");
    mutate(next);
    const query = next.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };
  const toggleListValue = (key: string, value: string) =>
    updateParams((params) => {
      const values = new Set(params.getAll(key));
      if (values.has(value)) values.delete(value);
      else values.add(value);
      params.delete(key);
      values.forEach((entry) => params.append(key, entry));
    });
  const selected = (key: string, value: string) =>
    searchParams.getAll(key).includes(value);
  const dateScope = searchParams.get("date") as DateScope | null;

  return (
    <aside className="premium-panel rounded-md p-4 lg:sticky lg:top-20">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Filter className="size-4 text-secondary" aria-hidden="true" />
          Filters {activeCount ? `(${activeCount})` : ""}
        </div>
        {activeCount ? (
          <button
            type="button"
            onClick={() => router.push(pathname)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-secondary hover:text-foreground"
          >
            <RotateCcw className="size-3.5" aria-hidden="true" />
            Clear
          </button>
        ) : null}
      </div>
      <div className="grid gap-5">
        <FilterGroup title="City">
          <select
            value={searchParams.get("city") ?? ""}
            onChange={(event) =>
              updateParams((params) => {
                params.delete("city");
                if (event.target.value)
                  params.append("city", event.target.value);
              })
            }
            className="h-10 rounded-md border border-white/10 bg-background/70 px-3 text-sm text-foreground focus:border-secondary"
          >
            <option value="">All cities</option>
            {cities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </FilterGroup>
        <FilterGroup title="Category">
          {categories.map((category) => (
            <label
              key={category}
              className="flex items-center gap-2 text-sm text-muted"
            >
              <input
                type="checkbox"
                checked={selected("category", category)}
                onChange={() => toggleListValue("category", category)}
              />
              {category}
            </label>
          ))}
        </FilterGroup>
        <FilterGroup title="Event type">
          {eventTypes.map((type) => (
            <label
              key={type}
              className="flex items-center gap-2 text-sm text-muted"
            >
              <input
                type="checkbox"
                checked={selected("eventType", type)}
                onChange={() => toggleListValue("eventType", type)}
              />
              {type.replaceAll("_", " ")}
            </label>
          ))}
        </FilterGroup>
        <FilterGroup title="Date">
          <div className="grid grid-cols-2 gap-2">
            {dateOptions.map(([value, label]) => (
              <button
                type="button"
                key={value}
                onClick={() =>
                  updateParams((params) => params.set("date", value))
                }
                className={`min-h-9 rounded-md border px-2 text-xs font-medium ${dateScope === value ? "border-secondary bg-secondary/15 text-foreground shadow-[0_0_18px_rgba(6,182,212,0.12)]" : "border-white/10 text-muted hover:bg-white/[0.07] hover:text-foreground"}`}
              >
                {label}
              </button>
            ))}
          </div>
          {dateScope === "custom" ? (
            <div className="grid gap-2">
              <input
                type="date"
                value={searchParams.get("startDate") ?? ""}
                onChange={(event) =>
                  updateParams((params) => {
                    if (event.target.value)
                      params.set("startDate", event.target.value);
                    else params.delete("startDate");
                  })
                }
                className="h-10 rounded-md border border-white/10 bg-background/70 px-3 text-sm focus:border-secondary"
                aria-label="Start date"
              />
              <input
                type="date"
                value={searchParams.get("endDate") ?? ""}
                onChange={(event) =>
                  updateParams((params) => {
                    if (event.target.value)
                      params.set("endDate", event.target.value);
                    else params.delete("endDate");
                  })
                }
                className="h-10 rounded-md border border-white/10 bg-background/70 px-3 text-sm focus:border-secondary"
                aria-label="End date"
              />
            </div>
          ) : null}
        </FilterGroup>
        <FilterGroup title="Language">
          {languages.map((language) => (
            <label
              key={language}
              className="flex items-center gap-2 text-sm text-muted"
            >
              <input
                type="checkbox"
                checked={selected("language", language)}
                onChange={() => toggleListValue("language", language)}
              />
              {language}
            </label>
          ))}
        </FilterGroup>
        <FilterGroup title="Genre">
          {genres.map((genre) => (
            <label
              key={genre}
              className="flex items-center gap-2 text-sm text-muted"
            >
              <input
                type="checkbox"
                checked={selected("genre", genre)}
                onChange={() => toggleListValue("genre", genre)}
              />
              {genre}
            </label>
          ))}
        </FilterGroup>
        <FilterGroup title="Price range">
          {priceBuckets.map(([value, label]) => (
            <label
              key={value}
              className="flex items-center gap-2 text-sm text-muted"
            >
              <input
                type="checkbox"
                checked={selected("price", value)}
                onChange={() => toggleListValue("price", value)}
              />
              {label}
            </label>
          ))}
        </FilterGroup>
        <FilterGroup title="Venue">
          <input
            defaultValue={searchParams.get("venue") ?? ""}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                const value = event.currentTarget.value.trim();
                updateParams((params) => {
                  params.delete("venue");
                  if (value) params.append("venue", value);
                });
              }
            }}
            placeholder="Venue name"
            className="h-10 rounded-md border border-white/10 bg-background/70 px-3 text-sm placeholder:text-muted focus:border-secondary"
          />
        </FilterGroup>
        <FilterGroup title="Rating">
          <select
            value={searchParams.get("rating") ?? ""}
            onChange={(event) =>
              updateParams((params) => {
                if (event.target.value)
                  params.set("rating", event.target.value);
                else params.delete("rating");
              })
            }
            className="h-10 rounded-md border border-white/10 bg-background/70 px-3 text-sm focus:border-secondary"
          >
            <option value="">Any rating</option>
            <option value="4">4.0 and above</option>
            <option value="4.5">4.5 and above</option>
            <option value="7">7.0 and above</option>
            <option value="8">8.0 and above</option>
          </select>
        </FilterGroup>
        <FilterGroup title="Availability">
          <label className="flex items-center gap-2 text-sm text-muted">
            <input
              type="radio"
              name="availability"
              checked={!searchParams.get("availability")}
              onChange={() =>
                updateParams((params) => params.delete("availability"))
              }
            />
            Any availability
          </label>
          <label className="flex items-center gap-2 text-sm text-muted">
            <input
              type="radio"
              name="availability"
              checked={searchParams.get("availability") === "available"}
              onChange={() =>
                updateParams((params) =>
                  params.set("availability", "available"),
                )
              }
            />
            Available
          </label>
          <label className="flex items-center gap-2 text-sm text-muted">
            <input
              type="radio"
              name="availability"
              checked={searchParams.get("availability") === "sold-out"}
              onChange={() =>
                updateParams((params) => params.set("availability", "sold-out"))
              }
            />
            Sold out
          </label>
        </FilterGroup>
      </div>
    </aside>
  );
}
