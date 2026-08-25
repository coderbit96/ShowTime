import { connectToDatabase } from "@/lib/mongodb/connect";
import { Event, Show } from "@/models";
import { mockCatalog } from "./mock-catalog";
import type { ContentCard, EventDetail } from "./types";

type DatabaseEvent = {
  _id: { toString(): string };
  slug: string;
  title: string;
  description: string;
  poster: string;
  banner?: string;
  eventType: string;
  startsAt: Date;
  endsAt: Date;
  durationMinutes?: number;
  language?: string[];
  ageRestriction?: string;
  artists?: Array<{ name: string; role?: string; image?: string }>;
  rating?: number;
  category?: { name: string } | null;
  venue?: {
    name: string;
    address: string;
    city?: { name: string } | null;
  } | null;
  organizer?: {
    organizationName: string;
    description?: string;
    logo?: string;
  } | null;
};

type DatabaseShow = {
  _id: { toString(): string };
  pricing: Array<{ price: number }>;
  startTime: Date;
  endTime: Date;
};

const eventDescriptions: Record<string, string> = {
  "midnight-grove-live":
    "An open-air night of live music, luminous stage design, and the kind of crowd that remembers every chorus. Midnight Grove brings its full live set to Bandra for one unhurried evening under the lights.",
  "moonlit-market":
    "An after-dark city market with independent food, makers, music, and small discoveries worth lingering over.",
  "designing-for-joy":
    "A practical and generous workshop for people building more thoughtful, human work and wanting a little more joy in the process.",
  "late-laughs-club":
    "A tight, late-night comedy bill with fresh sets, sharp observations, and no pressure to become part of the show.",
  "mumbai-hoops-night":
    "A high-energy home-court night with big plays, louder crowds, and a game that keeps moving until the final buzzer.",
  "harbour-derby":
    "Two local rivals, one historic ground, and a match-day atmosphere that starts long before kickoff.",
  "glow-kayak":
    "A guided evening paddle across Powai Lake with illuminated kayaks, a small group, and the city settling into night around you.",
};

const artistsByType: Record<string, EventDetail["artists"]> = {
  CONCERT: [
    { name: "Mira Vale", role: "Lead vocals" },
    { name: "Arin D'Souza", role: "Guitar" },
    { name: "The Midnight Grove Ensemble", role: "Live band" },
  ],
  COMEDY: [
    { name: "Kunal Mehta", role: "Headliner" },
    { name: "Rhea Kapur", role: "Featuring" },
    { name: "Nikhil Rao", role: "Featuring" },
  ],
  SPORT: [
    { name: "Mumbai Hoops", role: "Home team" },
    { name: "Harbour Athletic", role: "Away team" },
  ],
  FESTIVAL: [
    { name: "Moonlit Market Collective", role: "Curated by" },
    { name: "Local makers and food partners", role: "Featuring" },
  ],
  WORKSHOP: [{ name: "Aanya Sharma", role: "Workshop host" }],
  ADVENTURE: [{ name: "Powai Paddle Collective", role: "Guides" }],
};

const categoryFromEventType: Record<string, EventDetail["category"]> = {
  CONCERT: "Concert",
  COMEDY: "Comedy",
  SPORT: "Sports",
  ADVENTURE: "Experience",
  SPECIAL_EXPERIENCE: "Experience",
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "long",
    weekday: "long",
    year: "numeric",
  }).format(date);
}

function formatTime(date: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return hours ? `${hours}h ${remainingMinutes}m` : `${remainingMinutes} min`;
}

function mockEventDetail(item: ContentCard): EventDetail {
  const startsAt = new Date(item.startsAt ?? "2026-08-30T17:00:00+05:30");
  const eventType = item.eventType ?? "LOCAL";
  const duration =
    eventType === "CONCERT" ? "2h 30m" : eventType === "SPORT" ? "2h" : "2h";

  return {
    id: item.id,
    slug: item.slug,
    title: item.title,
    category: item.category,
    eventType,
    banner: item.image,
    poster: item.image,
    description:
      eventDescriptions[item.slug] ??
      "A well-made plan for an evening out, bringing a fresh live experience to the city.",
    rating: item.rating,
    dateLabel: formatDate(startsAt),
    timeLabel: item.timeLabel,
    duration,
    language: item.language?.split(", ") ?? ["English"],
    ageRestriction: eventType === "COMEDY" ? "16+" : "All ages",
    artists: artistsByType[eventType] ?? [
      { name: item.title, role: "Featured experience" },
    ],
    venue: {
      name: item.venue,
      address: `${item.venue}, ${item.city}`,
      city: item.city,
    },
    priceFrom: item.priceFrom,
    organizer: {
      name:
        eventType === "CONCERT"
          ? "Grove House Productions"
          : "Show Time Experiences",
      description:
        "Independent live experiences, thoughtfully produced for the city.",
    },
    showId: undefined,
  };
}

function formatDatabaseEvent(
  event: DatabaseEvent,
  show: DatabaseShow | null,
): EventDetail {
  const durationMinutes =
    event.durationMinutes ??
    Math.max(
      1,
      Math.round((event.endsAt.getTime() - event.startsAt.getTime()) / 60000),
    );
  const priceFrom = show?.pricing.length
    ? Math.min(...show.pricing.map((price) => price.price))
    : 0;

  return {
    id: event._id.toString(),
    slug: event.slug,
    title: event.title,
    category:
      categoryFromEventType[event.eventType] ??
      (event.category?.name as EventDetail["category"] | undefined) ??
      "Live Event",
    eventType: event.eventType,
    banner: event.banner ?? event.poster,
    poster: event.poster,
    description: event.description,
    rating: event.rating,
    dateLabel: formatDate(show?.startTime ?? event.startsAt),
    timeLabel: formatTime(show?.startTime ?? event.startsAt),
    duration: formatDuration(durationMinutes),
    language: event.language?.length ? event.language : ["English"],
    ageRestriction: event.ageRestriction ?? "All ages",
    artists: (event.artists ?? []).map((artist) => ({
      name: artist.name,
      role: artist.role ?? "Artist",
      image: artist.image,
    })),
    venue: {
      name: event.venue?.name ?? "Venue to be announced",
      address: event.venue?.address ?? "Address to be announced",
      city: event.venue?.city?.name ?? "",
    },
    priceFrom,
    organizer: {
      name: event.organizer?.organizationName ?? "Show Time Experiences",
      description: event.organizer?.description,
      logo: event.organizer?.logo,
    },
    showId: show?._id.toString(),
  };
}

export async function getEventDetail(
  slug: string,
): Promise<EventDetail | null> {
  try {
    await connectToDatabase();
    const event = (await Event.findOne({
      slug,
      active: true,
      status: "PUBLISHED",
    })
      .populate("category", "name")
      .populate({
        path: "venue",
        select: "name address",
        populate: { path: "city", select: "name" },
      })
      .populate("organizer", "organizationName description logo")
      .lean()) as unknown as DatabaseEvent | null;

    if (event) {
      const show = (await Show.findOne({
        event: event._id.toString(),
        active: true,
        bookingStatus: "SCHEDULED",
      })
        .sort({ startTime: 1 })
        .select("_id pricing startTime endTime")
        .lean()) as unknown as DatabaseShow | null;
      return formatDatabaseEvent(event, show);
    }
  } catch {
    // The seeded catalog intentionally keeps the customer experience usable before Atlas is populated.
  }

  const item = mockCatalog.find(
    (entry) => entry.slug === slug && entry.category !== "Movie",
  );
  return item ? mockEventDetail(item) : null;
}
