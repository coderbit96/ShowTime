import { mockCatalog, type ContentCard } from "@/lib/catalog";
import { connectToDatabase } from "@/lib/mongodb/connect";
import { Category, City, Event, Movie, Show, Venue } from "@/models";
import type { PriceBucket, SearchFilters, SearchResponse } from "./types";

type DatabaseShow = {
  _id: { toString(): string };
  contentType: "MOVIE" | "EVENT";
  date: Date;
  startTime: Date;
  pricing: Array<{ price: number }>;
  bookingStatus: "SCHEDULED" | "SOLD_OUT" | "CANCELLED" | "COMPLETED";
  seatAvailability: Array<{
    status: "AVAILABLE" | "LOCKED" | "BOOKED" | "BLOCKED";
  }>;
  movie?: {
    _id: { toString(): string };
    title: string;
    poster: string;
    language: string[];
    genre: string[];
    duration: number;
    rating: number;
  } | null;
  event?: {
    _id: { toString(): string };
    title: string;
    poster: string;
    eventType: string;
  } | null;
  venue?: { name: string } | null;
  category?: { name: string } | null;
};

type MongoFilter = Record<string, unknown>;

const EVENT_TYPE_TO_CATEGORY: Record<string, ContentCard["category"]> = {
  CONCERT: "Concert",
  COMEDY: "Comedy",
  SPORT: "Sports",
  ADVENTURE: "Experience",
  SPECIAL_EXPERIENCE: "Experience",
  MOVIE: "Movie",
};

const toSlug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const priceClauses: Record<PriceBucket, MongoFilter> = {
  "under-299": { "pricing.price": { $lt: 300 } },
  "under-499": { "pricing.price": { $lt: 500 } },
  "300-599": { "pricing.price": { $gte: 300, $lte: 599 } },
  "600-999": { "pricing.price": { $gte: 600, $lte: 999 } },
  "1000-plus": { "pricing.price": { $gte: 1000 } },
};

function dayRange(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

function getDateRange(filters: SearchFilters) {
  const now = new Date();
  if (filters.dateScope === "today") return dayRange(now);
  if (filters.dateScope === "tomorrow") {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return dayRange(tomorrow);
  }
  if (filters.dateScope === "weekend") {
    const start = new Date(now);
    const daysUntilSaturday = (6 - start.getDay() + 7) % 7;
    start.setDate(start.getDate() + daysUntilSaturday);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 2);
    return { start, end };
  }
  if (
    filters.dateScope === "custom" &&
    (filters.startDate || filters.endDate)
  ) {
    const start = filters.startDate ? new Date(filters.startDate) : new Date(0);
    const end = filters.endDate
      ? new Date(filters.endDate)
      : new Date("9999-12-31");
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }
  return null;
}

function priceMatches(price: number, buckets: PriceBucket[]) {
  return (
    buckets.length === 0 ||
    buckets.some((bucket) => {
      if (bucket === "under-299") return price < 300;
      if (bucket === "under-499") return price < 500;
      if (bucket === "300-599") return price >= 300 && price <= 599;
      if (bucket === "600-999") return price >= 600 && price <= 999;
      return price >= 1000;
    })
  );
}

function searchMockCatalog(filters: SearchFilters): SearchResponse {
  const query = filters.query?.toLowerCase();
  const range = getDateRange(filters);
  const matches = mockCatalog.filter((item) => {
    const haystack = [
      item.title,
      item.category,
      item.eventType,
      item.venue,
      item.city,
      item.language,
      item.genre,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const startsAt = item.startsAt ? new Date(item.startsAt) : null;

    return (
      (!query || haystack.includes(query)) &&
      (filters.city.length === 0 ||
        filters.city.some((city) => toSlug(city) === toSlug(item.city))) &&
      (filters.category.length === 0 ||
        filters.category.some(
          (category) => toSlug(category) === toSlug(item.category),
        )) &&
      (filters.eventType.length === 0 ||
        filters.eventType.includes(item.eventType ?? "")) &&
      (filters.language.length === 0 ||
        filters.language.some((language) =>
          item.language?.toLowerCase().includes(language.toLowerCase()),
        )) &&
      (filters.genre.length === 0 ||
        filters.genre.some((genre) =>
          item.genre?.toLowerCase().includes(genre.toLowerCase()),
        )) &&
      (filters.venue.length === 0 ||
        filters.venue.some((venue) => toSlug(venue) === toSlug(item.venue))) &&
      priceMatches(item.priceFrom, filters.price) &&
      (!filters.rating || (item.rating ?? 0) >= filters.rating) &&
      (!filters.availability ||
        (filters.availability === "available" &&
          item.availability !== "SOLD_OUT") ||
        (filters.availability === "sold-out" &&
          item.availability === "SOLD_OUT")) &&
      (!range ||
        (startsAt !== null && startsAt >= range.start && startsAt < range.end))
    );
  });

  const offset = (filters.page - 1) * filters.limit;
  return {
    items: matches.slice(offset, offset + filters.limit),
    total: matches.length,
    page: filters.page,
    limit: filters.limit,
    source: "mock",
  };
}

function formatDatabaseShow(show: DatabaseShow): ContentCard | null {
  const content = show.contentType === "MOVIE" ? show.movie : show.event;
  if (!content) return null;

  const priceFrom = Math.min(...show.pricing.map((entry) => entry.price));
  const date = new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    weekday: "short",
  }).format(show.date);
  const time = new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  }).format(show.startTime);
  const isMovie = show.contentType === "MOVIE";
  const event = show.event;

  return {
    id: show._id.toString(),
    slug: content._id.toString(),
    title: content.title,
    category: isMovie
      ? "Movie"
      : (EVENT_TYPE_TO_CATEGORY[event?.eventType ?? ""] ?? "Live Event"),
    image: content.poster,
    city: "",
    venue: show.venue?.name ?? "Venue to be announced",
    dateLabel: date,
    timeLabel: time,
    priceFrom: Number.isFinite(priceFrom) ? priceFrom : 0,
    rating: isMovie ? show.movie?.rating : undefined,
    language: isMovie ? show.movie?.language.join(", ") : undefined,
    genre: isMovie ? show.movie?.genre.join(", ") : undefined,
    duration: isMovie && show.movie ? `${show.movie.duration} min` : undefined,
    eventType: isMovie ? "MOVIE" : event?.eventType,
    startsAt: show.startTime.toISOString(),
    availability: show.bookingStatus === "SOLD_OUT" ? "SOLD_OUT" : "AVAILABLE",
  };
}

async function searchDatabase(filters: SearchFilters): Promise<SearchResponse> {
  await connectToDatabase();
  const showFilter: MongoFilter = {
    active: true,
    bookingStatus:
      filters.availability === "sold-out" ? "SOLD_OUT" : { $ne: "CANCELLED" },
  };

  const [cities, categories, venues] = await Promise.all([
    filters.city.length
      ? City.find({ slug: { $in: filters.city.map(toSlug) }, active: true })
          .select("_id")
          .lean()
      : [],
    filters.category.length
      ? Category.find({
          slug: { $in: filters.category.map(toSlug) },
          active: true,
        })
          .select("_id")
          .lean()
      : [],
    filters.venue.length
      ? Venue.find({ slug: { $in: filters.venue.map(toSlug) }, active: true })
          .select("_id")
          .lean()
      : [],
  ]);

  if (filters.city.length)
    showFilter.city = { $in: cities.map((city) => city._id) };
  if (filters.category.length) {
    showFilter.category = { $in: categories.map((category) => category._id) };
  }
  if (filters.venue.length)
    showFilter.venue = { $in: venues.map((venue) => venue._id) };
  if (filters.price.length) {
    showFilter.$or = filters.price.map((bucket) => priceClauses[bucket]);
  }
  if (filters.availability === "available") {
    showFilter["seatAvailability.status"] = "AVAILABLE";
  }

  const range = getDateRange(filters);
  if (range) showFilter.date = { $gte: range.start, $lt: range.end };

  const contentClauses: MongoFilter[] = [];
  const query = filters.query?.trim();
  const searchText = query ? { $text: { $search: query } } : {};
  const eventFilter: MongoFilter = {
    active: true,
    status: "PUBLISHED",
    ...searchText,
  };
  if (filters.eventType.length)
    eventFilter.eventType = { $in: filters.eventType };
  const shouldSearchEvents =
    filters.eventType.length === 0 || !filters.eventType.includes("MOVIE");
  const shouldSearchMovies =
    filters.eventType.length === 0 || filters.eventType.includes("MOVIE");

  if (shouldSearchEvents) {
    const events = await Event.find(eventFilter).select("_id").lean();
    contentClauses.push({ event: { $in: events.map((event) => event._id) } });
  }
  if (shouldSearchMovies) {
    const movieFilter: MongoFilter = { active: true, ...searchText };
    if (filters.language.length)
      movieFilter.language = { $in: filters.language };
    if (filters.genre.length) movieFilter.genre = { $in: filters.genre };
    if (filters.rating) movieFilter.rating = { $gte: filters.rating };
    const movies = await Movie.find(movieFilter).select("_id").lean();
    contentClauses.push({ movie: { $in: movies.map((movie) => movie._id) } });
  }
  if (contentClauses.length) showFilter.$and = [{ $or: contentClauses }];

  const [shows, total] = await Promise.all([
    Show.find(showFilter)
      .sort({ date: 1, startTime: 1 })
      .skip((filters.page - 1) * filters.limit)
      .limit(filters.limit)
      .populate("movie", "title poster language genre duration rating")
      .populate("event", "title poster eventType")
      .populate("venue", "name")
      .populate("category", "name")
      .lean(),
    Show.countDocuments(showFilter),
  ]);

  return {
    items: (shows as unknown as DatabaseShow[])
      .map(formatDatabaseShow)
      .filter((item): item is ContentCard => item !== null),
    total,
    page: filters.page,
    limit: filters.limit,
    source: "database",
  };
}

export async function searchCatalog(
  filters: SearchFilters,
): Promise<SearchResponse> {
  try {
    const result = await searchDatabase(filters);
    // Development stays useful before Atlas is seeded; production data always wins once present.
    return result.total > 0 ? result : searchMockCatalog(filters);
  } catch {
    return searchMockCatalog(filters);
  }
}
