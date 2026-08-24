import {
  emptySearchFilters,
  type AvailabilityFilter,
  type DateScope,
  type PriceBucket,
  type SearchFilters,
} from "./types";

const dateScopes = new Set<DateScope>([
  "today",
  "tomorrow",
  "weekend",
  "custom",
]);
const priceBuckets = new Set<PriceBucket>([
  "under-299",
  "300-599",
  "600-999",
  "1000-plus",
]);
const availabilityValues = new Set<AvailabilityFilter>([
  "available",
  "sold-out",
]);

const listValue = (params: URLSearchParams, key: string) =>
  params
    .getAll(key)
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter(Boolean);

const boundedNumber = (value: string | null, fallback: number, max: number) => {
  const number = Number(value);
  return Number.isInteger(number) && number > 0
    ? Math.min(number, max)
    : fallback;
};

export function parseSearchParams(params: URLSearchParams): SearchFilters {
  const filters = emptySearchFilters();
  const query = params.get("q")?.trim();
  const dateScope = params.get("date");
  const availability = params.get("availability");
  const rating = Number(params.get("rating"));

  return {
    ...filters,
    ...(query ? { query: query.slice(0, 120) } : {}),
    city: listValue(params, "city"),
    category: listValue(params, "category"),
    eventType: listValue(params, "eventType"),
    language: listValue(params, "language"),
    genre: listValue(params, "genre"),
    price: listValue(params, "price").filter((value): value is PriceBucket =>
      priceBuckets.has(value as PriceBucket),
    ),
    venue: listValue(params, "venue"),
    ...(dateScopes.has(dateScope as DateScope)
      ? { dateScope: dateScope as DateScope }
      : {}),
    ...(params.get("startDate") ? { startDate: params.get("startDate")! } : {}),
    ...(params.get("endDate") ? { endDate: params.get("endDate")! } : {}),
    ...(Number.isFinite(rating) && rating >= 0 && rating <= 10
      ? { rating }
      : {}),
    ...(availabilityValues.has(availability as AvailabilityFilter)
      ? { availability: availability as AvailabilityFilter }
      : {}),
    page: boundedNumber(params.get("page"), 1, 10_000),
    limit: boundedNumber(params.get("limit"), 24, 48),
  };
}

export function filtersToSearchParams(filters: SearchFilters) {
  const params = new URLSearchParams();
  if (filters.query) params.set("q", filters.query);

  const listFilters: Array<[string, string[]]> = [
    ["city", filters.city],
    ["category", filters.category],
    ["eventType", filters.eventType],
    ["language", filters.language],
    ["genre", filters.genre],
    ["price", filters.price],
    ["venue", filters.venue],
  ];
  listFilters.forEach(([key, values]) =>
    values.forEach((value) => params.append(key, value)),
  );

  if (filters.dateScope) params.set("date", filters.dateScope);
  if (filters.startDate) params.set("startDate", filters.startDate);
  if (filters.endDate) params.set("endDate", filters.endDate);
  if (filters.rating) params.set("rating", String(filters.rating));
  if (filters.availability) params.set("availability", filters.availability);
  if (filters.page > 1) params.set("page", String(filters.page));
  if (filters.limit !== 24) params.set("limit", String(filters.limit));

  return params;
}
