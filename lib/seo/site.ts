import { connectToDatabase } from "@/lib/mongodb/connect";
import { mockCatalog } from "@/lib/catalog/mock-catalog";
import { Event, Movie } from "@/models";

export const siteUrl =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
  "https://showtime.vercel.app";

export function absoluteUrl(path: string) {
  return `${siteUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

export function canonicalPath(path: string) {
  return path === "/" ? "/" : path.replace(/\/$/, "");
}

export function breadcrumbJsonLd(items: Array<{ name: string; url: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function eventJsonLd(event: {
  title: string;
  description: string;
  banner: string;
  dateLabel: string;
  timeLabel: string;
  venue: { name: string; address: string; city: string };
  priceFrom: number;
  organizer: { name: string };
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    description: event.description,
    image: [event.banner],
    startDate: `${event.dateLabel} ${event.timeLabel}`,
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    location: {
      "@type": "Place",
      name: event.venue.name,
      address: {
        "@type": "PostalAddress",
        streetAddress: event.venue.address,
        addressLocality: event.venue.city,
        addressCountry: "IN",
      },
    },
    organizer: {
      "@type": "Organization",
      name: event.organizer.name,
    },
    offers: {
      "@type": "Offer",
      price: event.priceFrom,
      priceCurrency: "INR",
      availability: "https://schema.org/InStock",
    },
  };
}

export function movieJsonLd(movie: {
  title: string;
  description: string;
  banner: string;
  poster: string;
  genre: string[];
  language: string[];
  duration: string;
  rating: number;
  releaseDate: string;
  cast: Array<{ name: string }>;
  crew: Array<{ name: string; role: string }>;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Movie",
    name: movie.title,
    description: movie.description,
    image: [movie.banner, movie.poster],
    genre: movie.genre,
    inLanguage: movie.language,
    duration: movie.duration,
    datePublished: movie.releaseDate,
    actor: movie.cast.map((person) => ({
      "@type": "Person",
      name: person.name,
    })),
    director: movie.crew
      .filter((person) => /director/i.test(person.role))
      .map((person) => ({ "@type": "Person", name: person.name })),
    aggregateRating:
      movie.rating > 0
        ? {
            "@type": "AggregateRating",
            ratingValue: movie.rating,
            bestRating: 10,
          }
        : undefined,
  };
}

export async function getSitemapEntries() {
  const staticEntries = [
    { url: absoluteUrl("/"), priority: 1 },
    { url: absoluteUrl("/search"), priority: 0.8 },
    { url: absoluteUrl("/groups"), priority: 0.5 },
  ];
  try {
    await connectToDatabase();
    const [events, movies] = await Promise.all([
      Event.find({ active: true, status: "PUBLISHED" })
        .select("slug updatedAt")
        .lean(),
      Movie.find({ active: true }).select("slug updatedAt").lean(),
    ]);
    return [
      ...staticEntries,
      ...events.map((event) => ({
        url: absoluteUrl(`/events/${event.slug}`),
        lastModified: event.updatedAt,
        priority: 0.9,
      })),
      ...movies.map((movie) => ({
        url: absoluteUrl(`/movies/${movie.slug}`),
        lastModified: movie.updatedAt,
        priority: 0.9,
      })),
    ];
  } catch {
    return [
      ...staticEntries,
      ...mockCatalog.map((item) => ({
        url: absoluteUrl(
          item.category === "Movie"
            ? `/movies/${item.slug}`
            : `/events/${item.slug}`,
        ),
        priority: 0.75,
      })),
    ];
  }
}
