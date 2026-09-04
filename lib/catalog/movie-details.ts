import { connectToDatabase } from "@/lib/mongodb/connect";
import { Movie, Show } from "@/models";
import { kolkataCinemas } from "./kolkata-cinemas";
import { mockCatalog } from "./mock-catalog";
import type { ContentCard, MovieDetail, MovieShowtime } from "./types";

type DatabaseMovie = {
  _id: { toString(): string };
  slug: string;
  title: string;
  poster: string;
  banner?: string;
  description: string;
  language: string[];
  genre: string[];
  cast: Array<{ name: string; role?: string; image?: string }>;
  crew: Array<{ name: string; role?: string; image?: string }>;
  trailer?: string;
  duration: number;
  certificate: string;
  releaseDate: Date;
  rating: number;
};

type DatabaseMovieShow = {
  _id: { toString(): string };
  date: Date;
  startTime: Date;
  pricing: Array<{ price: number }>;
  bookingStatus: "SCHEDULED" | "SOLD_OUT" | "CANCELLED" | "COMPLETED";
  city?: { name: string } | null;
  cinema?: { name: string; address: string } | null;
  screen?: { name: string } | null;
};

const movieDescriptions: Record<string, string> = {
  "the-last-forest":
    "When a conservation researcher returns to the forest that shaped her childhood, an unexpected discovery turns a quiet homecoming into a race to protect a living world on the edge.",
  "indigo-summer":
    "A restless songwriter and a meticulous architect meet during one monsoon season, finding that the plans they have been following are not the lives they want.",
  "orbit-9":
    "A daring crew crosses the last uncharted edge of the solar system, where a signal from the deep asks them to question everything they came to find.",
};

const creditsBySlug: Record<
  string,
  Pick<MovieDetail, "cast" | "crew" | "certificate" | "releaseDate" | "trailer">
> = {
  "the-last-forest": {
    cast: [
      { name: "Aisha Menon", role: "Maya Rao" },
      { name: "Karan Sethi", role: "Dev Malik" },
      { name: "Leela George", role: "Nandita" },
    ],
    crew: [
      { name: "Nia Fernandes", role: "Director" },
      { name: "Rohan Iyer", role: "Writer" },
      { name: "Vikram Das", role: "Music" },
    ],
    certificate: "UA 13+",
    releaseDate: "18 July 2026",
    trailer: "https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ",
  },
  "indigo-summer": {
    cast: [
      { name: "Maya Suri", role: "Ira" },
      { name: "Kabir Anand", role: "Rishi" },
      { name: "Nandini Roy", role: "Meera" },
    ],
    crew: [
      { name: "Devika Paul", role: "Director" },
      { name: "Ishaan Kapoor", role: "Writer" },
      { name: "Sara Khan", role: "Music" },
    ],
    certificate: "UA 13+",
    releaseDate: "8 August 2026",
    trailer: "https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ",
  },
  "orbit-9": {
    cast: [
      { name: "Arjun Bose", role: "Eli" },
      { name: "Tara Dutta", role: "Commander Nara" },
      { name: "Evan Cole", role: "Miller" },
    ],
    crew: [
      { name: "Samar Khanna", role: "Director" },
      { name: "Meera Patel", role: "Writer" },
      { name: "Ira Ghosh", role: "Visual design" },
    ],
    certificate: "UA 13+",
    releaseDate: "28 August 2026",
    trailer: "https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ",
  },
};

function formatDuration(minutes: number) {
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function durationToMinutes(duration: string) {
  const match = /(?:(\d+)h)?\s*(?:(\d+)m)?/i.exec(duration);
  return Number(match?.[1] ?? 0) * 60 + Number(match?.[2] ?? 0);
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    weekday: "short",
  }).format(date);
}

function formatTime(date: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function mockShowtimes(item: ContentCard): MovieShowtime[] {
  const city = "Kolkata";
  const primaryCinema = item.venue;
  const alternativeCinema =
    item.slug === "the-last-forest"
      ? "PVR: Mani Square Mall"
      : "Cinepolis: Acropolis Mall";
  const basePrice = item.priceFrom;
  const days = ["2026-09-04", "2026-09-05", "2026-09-06"];
  const timeSlots = ["4:15 pm", "7:10 pm", "10:05 pm"];

  return days.flatMap((date, dayIndex) =>
    timeSlots.map((time, timeIndex) => ({
      id: `show-${item.id}-${date}-${timeIndex}`,
      city,
      cinema: dayIndex === 1 ? alternativeCinema : primaryCinema,
      cinemaAddress:
        dayIndex === 1
          ? (kolkataCinemas.find((cinema) => cinema.name === alternativeCinema)
              ?.address ?? "Kolkata")
          : `${primaryCinema}, ${city}`,
      screen: timeIndex === 1 ? "Screen 3" : "Screen 1",
      date,
      dateLabel: formatDate(new Date(`${date}T12:00:00+05:30`)),
      time,
      priceFrom: basePrice + timeIndex * 40,
      availability:
        dayIndex === 2 && timeIndex === 2 ? "SOLD_OUT" : "AVAILABLE",
    })),
  );
}

function mockMovieDetail(item: ContentCard): MovieDetail {
  const credits = creditsBySlug[item.slug];
  return {
    id: item.id,
    slug: item.slug,
    title: item.title,
    poster: item.image,
    banner: item.image,
    description:
      movieDescriptions[item.slug] ??
      "A new story for the big screen, made to be shared in the dark with a room full of people.",
    language: item.language?.split(", ") ?? ["English"],
    genre: item.genre?.split(", ") ?? ["Drama"],
    cast: credits?.cast ?? [{ name: "Cast to be announced", role: "Lead" }],
    crew: credits?.crew ?? [
      { name: "Crew to be announced", role: "Production" },
    ],
    trailer: credits?.trailer,
    duration: item.duration ?? "2h 00m",
    durationMinutes: durationToMinutes(item.duration ?? "2h 00m"),
    certificate: credits?.certificate ?? "UA 13+",
    releaseDate: credits?.releaseDate ?? "Coming soon",
    releaseDateISO: item.startsAt ?? "2026-09-01T00:00:00+05:30",
    rating: item.rating ?? 0,
    showtimes: mockShowtimes(item),
    cinemaChoices: kolkataCinemas,
  };
}

function formatDatabaseShow(show: DatabaseMovieShow): MovieShowtime {
  const priceFrom = Math.min(...show.pricing.map((pricing) => pricing.price));
  return {
    id: show._id.toString(),
    city: show.city?.name ?? "",
    cinema: show.cinema?.name ?? "Cinema to be announced",
    cinemaAddress: show.cinema?.address ?? "",
    screen: show.screen?.name ?? "Screen",
    date: toDateKey(show.date),
    dateLabel: formatDate(show.date),
    time: formatTime(show.startTime),
    priceFrom: Number.isFinite(priceFrom) ? priceFrom : 0,
    availability: show.bookingStatus === "SOLD_OUT" ? "SOLD_OUT" : "AVAILABLE",
  };
}

export async function getMovieDetail(
  slug: string,
): Promise<MovieDetail | null> {
  try {
    await connectToDatabase();
    const movie = (await Movie.findOne({
      slug,
      active: true,
    }).lean()) as unknown as DatabaseMovie | null;
    if (movie) {
      const shows = (await Show.find({
        movie: movie._id.toString(),
        contentType: "MOVIE",
        active: true,
        bookingStatus: { $in: ["SCHEDULED", "SOLD_OUT"] },
      })
        .sort({ date: 1, startTime: 1 })
        .populate("city", "name")
        .populate("cinema", "name address")
        .populate("screen", "name")
        .lean()) as unknown as DatabaseMovieShow[];

      return {
        id: movie._id.toString(),
        slug: movie.slug,
        title: movie.title,
        poster: movie.poster,
        banner: movie.banner ?? movie.poster,
        description: movie.description,
        language: movie.language,
        genre: movie.genre,
        cast: movie.cast.map((person) => ({
          name: person.name,
          role: person.role ?? "Cast",
          image: person.image,
        })),
        crew: movie.crew.map((person) => ({
          name: person.name,
          role: person.role ?? "Crew",
          image: person.image,
        })),
        trailer: movie.trailer,
        duration: formatDuration(movie.duration),
        durationMinutes: movie.duration,
        certificate: movie.certificate,
        releaseDate: new Intl.DateTimeFormat("en-IN", {
          day: "numeric",
          month: "long",
          year: "numeric",
        }).format(movie.releaseDate),
        releaseDateISO: movie.releaseDate.toISOString(),
        rating: movie.rating,
        showtimes: shows.map(formatDatabaseShow),
        cinemaChoices: kolkataCinemas,
      };
    }
  } catch {
    // The seeded catalog keeps movie browsing and picker behavior testable before Atlas is populated.
  }

  const item = mockCatalog.find(
    (entry) => entry.slug === slug && entry.category === "Movie",
  );
  return item ? mockMovieDetail(item) : null;
}
