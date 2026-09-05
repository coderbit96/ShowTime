import type { ContentCard, HomepageCatalog, VenueCard } from "./types";

const image = {
  forest: "/images/catalog/the-last-forest.png",
  indigo: "/images/catalog/indigo-summer.png",
  orbit: "/images/catalog/orbit-9.png",
  paperLanterns: "/images/catalog/paper-lanterns.png",
  lastTram: "/images/catalog/after-the-last-tram.png",
  neonMonsoon: "/images/catalog/neon-monsoon.png",
  teaHouseAtDawn: "/images/catalog/the-tea-house-at-dawn.png",
  velvetSignal: "/images/catalog/velvet-signal.png",
  midnightGrove: "/images/catalog/midnight-grove-live.png",
  cinema:
    "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=900&q=80",
  concert:
    "https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?auto=format&fit=crop&w=900&q=80",
  comedy:
    "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=900&q=80",
  stadium:
    "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=900&q=80",
  theatre:
    "https://images.unsplash.com/photo-1503095396549-807759245b35?auto=format&fit=crop&w=900&q=80",
  workshop:
    "https://images.unsplash.com/photo-1531058020387-3be344556be6?auto=format&fit=crop&w=900&q=80",
  gallery:
    "https://images.unsplash.com/photo-1561214115-f2f134cc4912?auto=format&fit=crop&w=900&q=80",
  food: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=900&q=80",
  arena:
    "https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=900&q=80",
};

export const mockCatalog: ContentCard[] = [
  {
    id: "movie-forest",
    slug: "the-last-forest",
    title: "The Last Forest",
    category: "Movie",
    image: image.forest,
    city: "Kolkata",
    venue: "INOX: South City",
    dateLabel: "In cinemas now",
    timeLabel: "Hindi, English",
    priceFrom: 220,
    rating: 8.6,
    badge: "Critics' pick",
    language: "Hindi, English",
    genre: "Drama, Mystery",
    duration: "2h 12m",
    eventType: "MOVIE",
    startsAt: "2026-08-24T18:30:00+05:30",
  },
  {
    id: "movie-indigo",
    slug: "indigo-summer",
    title: "Indigo Summer",
    category: "Movie",
    image: image.indigo,
    city: "Kolkata",
    venue: "PVR: Mani Square Mall",
    dateLabel: "In cinemas now",
    timeLabel: "Hindi",
    priceFrom: 190,
    rating: 8.1,
    language: "Hindi",
    genre: "Romance, Music",
    duration: "2h 04m",
    eventType: "MOVIE",
    startsAt: "2026-08-24T20:15:00+05:30",
  },
  {
    id: "movie-orbit",
    slug: "orbit-9",
    title: "Orbit 9",
    category: "Movie",
    image: image.orbit,
    city: "Kolkata",
    venue: "Cinepolis: Acropolis Mall",
    dateLabel: "Opening Friday",
    timeLabel: "English, Hindi",
    priceFrom: 240,
    rating: 7.9,
    badge: "Early access",
    language: "English, Hindi",
    genre: "Sci-fi, Adventure",
    duration: "2h 20m",
    eventType: "MOVIE",
    startsAt: "2026-08-28T19:00:00+05:30",
  },
  {
    id: "paper-lanterns",
    slug: "paper-lanterns",
    title: "Paper Lanterns",
    category: "Movie",
    image: image.paperLanterns,
    city: "Kolkata",
    venue: "PVR: Mani Square Mall",
    dateLabel: "In cinemas now",
    timeLabel: "Bengali, Hindi",
    priceFrom: 210,
    rating: 8.4,
    badge: "Audience favourite",
    language: "Bengali, Hindi",
    genre: "Drama, Romance",
    duration: "2h 08m",
    eventType: "MOVIE",
    startsAt: "2026-09-04T18:45:00+05:30",
  },
  {
    id: "after-last-tram",
    slug: "after-the-last-tram",
    title: "After the Last Tram",
    category: "Movie",
    image: image.lastTram,
    city: "Kolkata",
    venue: "Cinepolis: Acropolis Mall",
    dateLabel: "Now showing",
    timeLabel: "Hindi, English",
    priceFrom: 230,
    rating: 8.0,
    badge: "New release",
    language: "Hindi, English",
    genre: "Mystery, Thriller",
    duration: "1h 56m",
    eventType: "MOVIE",
    startsAt: "2026-09-04T20:30:00+05:30",
  },
  {
    id: "neon-monsoon",
    slug: "neon-monsoon",
    title: "Neon Monsoon",
    category: "Movie",
    image: image.neonMonsoon,
    city: "Kolkata",
    venue: "PVR: Mani Square Mall",
    dateLabel: "Now showing",
    timeLabel: "Hindi, Bengali",
    priceFrom: 250,
    rating: 8.3,
    badge: "Popular tonight",
    language: "Hindi, Bengali",
    genre: "Romance, Drama",
    duration: "2h 02m",
    eventType: "MOVIE",
    startsAt: "2026-09-04T19:10:00+05:30",
  },
  {
    id: "tea-house-at-dawn",
    slug: "the-tea-house-at-dawn",
    title: "The Tea House at Dawn",
    category: "Movie",
    image: image.teaHouseAtDawn,
    city: "Kolkata",
    venue: "INOX: South City",
    dateLabel: "Critics are talking",
    timeLabel: "Bengali, English",
    priceFrom: 200,
    rating: 8.5,
    badge: "Critics' pick",
    language: "Bengali, English",
    genre: "Drama, Mystery",
    duration: "1h 52m",
    eventType: "MOVIE",
    startsAt: "2026-09-05T18:20:00+05:30",
  },
  {
    id: "velvet-signal",
    slug: "velvet-signal",
    title: "Velvet Signal",
    category: "Movie",
    image: image.velvetSignal,
    city: "Kolkata",
    venue: "Cinepolis: Acropolis Mall",
    dateLabel: "Opening this weekend",
    timeLabel: "Hindi, English",
    priceFrom: 270,
    rating: 7.8,
    badge: "Edge of your seat",
    language: "Hindi, English",
    genre: "Thriller, Action",
    duration: "2h 10m",
    eventType: "MOVIE",
    startsAt: "2026-09-05T20:45:00+05:30",
  },
  {
    id: "moonlit-market",
    slug: "moonlit-market",
    title: "Moonlit Market",
    category: "Live Event",
    image: image.food,
    city: "Kolkata",
    venue: "Eco Park, New Town",
    dateLabel: "Sat, 30 Aug",
    timeLabel: "5:00 PM",
    priceFrom: 299,
    rating: 4.7,
    badge: "Selling fast",
    eventType: "FESTIVAL",
    startsAt: "2026-08-30T17:00:00+05:30",
  },
  {
    id: "designing-joy",
    slug: "designing-for-joy",
    title: "Designing for Joy",
    category: "Live Event",
    image: image.workshop,
    city: "Kolkata",
    venue: "Gyan Manch, Ballygunge",
    dateLabel: "Sun, 31 Aug",
    timeLabel: "11:00 AM",
    priceFrom: 349,
    rating: 4.8,
    eventType: "WORKSHOP",
    startsAt: "2026-08-31T11:00:00+05:30",
  },
  {
    id: "midnight-grove",
    slug: "midnight-grove-live",
    title: "Midnight Grove Live",
    category: "Concert",
    image: image.midnightGrove,
    city: "Kolkata",
    venue: "Nazrul Mancha, Rabindra Sadan",
    dateLabel: "Fri, 5 Sep",
    timeLabel: "7:30 PM",
    priceFrom: 899,
    rating: 4.9,
    badge: "Almost gone",
    eventType: "CONCERT",
    startsAt: "2026-09-05T19:30:00+05:30",
  },
  {
    id: "late-laughs",
    slug: "late-laughs-club",
    title: "Late Laughs Club",
    category: "Comedy",
    image: image.comedy,
    city: "Kolkata",
    venue: "Kala Mandir, Shakespeare Sarani",
    dateLabel: "Tonight",
    timeLabel: "9:30 PM",
    priceFrom: 399,
    rating: 4.6,
    eventType: "COMEDY",
    startsAt: "2026-08-24T21:30:00+05:30",
  },
  {
    id: "kolkata-hoops",
    slug: "kolkata-hoops-night",
    title: "Kolkata Hoops Night",
    category: "Sports",
    image: image.arena,
    city: "Kolkata",
    venue: "Netaji Indoor Stadium, Eden Gardens",
    dateLabel: "Sun, 7 Sep",
    timeLabel: "6:00 PM",
    priceFrom: 599,
    rating: 4.7,
    eventType: "SPORT",
    startsAt: "2026-09-07T18:00:00+05:30",
  },
  {
    id: "harbour-derby",
    slug: "harbour-derby",
    title: "Harbour Derby",
    category: "Sports",
    image: image.stadium,
    city: "Kolkata",
    venue: "Salt Lake Stadium",
    dateLabel: "Sun, 31 Aug",
    timeLabel: "7:00 PM",
    priceFrom: 249,
    rating: 4.6,
    eventType: "SPORT",
    startsAt: "2026-08-31T19:00:00+05:30",
  },
  {
    id: "glow-kayak",
    slug: "glow-kayak",
    title: "Glow Kayak After Dark",
    category: "Experience",
    image: image.gallery,
    city: "Kolkata",
    venue: "Rabindra Sarobar",
    dateLabel: "Sat, 30 Aug",
    timeLabel: "6:30 PM",
    priceFrom: 449,
    rating: 4.8,
    badge: "Small group",
    eventType: "ADVENTURE",
    startsAt: "2026-08-30T18:30:00+05:30",
  },
];

export const mockVenues: VenueCard[] = [
  {
    id: "nazrul-mancha",
    name: "Nazrul Mancha",
    neighborhood: "Rabindra Sadan",
    city: "Kolkata",
    image: image.food,
    eventCount: 14,
    specialty: "Fairs, festivals, live acts",
  },
  {
    id: "gyan-manch",
    name: "Gyan Manch",
    neighborhood: "Ballygunge",
    city: "Kolkata",
    image: image.comedy,
    eventCount: 9,
    specialty: "Comedy and intimate shows",
  },
  {
    id: "rabindra-sadan",
    name: "Rabindra Sadan",
    neighborhood: "Maidan",
    city: "Kolkata",
    image: image.theatre,
    eventCount: 7,
    specialty: "Music, theatre, culture",
  },
  {
    id: "netaji-indoor",
    name: "Netaji Indoor Stadium",
    neighborhood: "Eden Gardens",
    city: "Kolkata",
    image: image.arena,
    eventCount: 11,
    specialty: "Sports and big nights",
  },
  {
    id: "science-city-auditorium",
    name: "Science City Auditorium",
    neighborhood: "EM Bypass",
    city: "Kolkata",
    image: image.cinema,
    eventCount: 8,
    specialty: "Family shows and exhibitions",
  },
  {
    id: "biswa-bangla-mela-prangan",
    name: "Biswa Bangla Mela Prangan",
    neighborhood: "New Town",
    city: "Kolkata",
    image: image.concert,
    eventCount: 16,
    specialty: "Festivals and large-scale events",
  },
  {
    id: "kala-mandir",
    name: "Kala Mandir",
    neighborhood: "Shakespeare Sarani",
    city: "Kolkata",
    image: image.gallery,
    eventCount: 6,
    specialty: "Theatre, dance, and classical music",
  },
  {
    id: "eco-park",
    name: "Eco Park",
    neighborhood: "New Town",
    city: "Kolkata",
    image: image.workshop,
    eventCount: 12,
    specialty: "Outdoor activities and weekend markets",
  },
];

const cityDetails: Record<
  string,
  { name: string; venues: string[]; neighborhoods: string[] }
> = {
  kolkata: {
    name: "Kolkata",
    venues: [
      "PVR: Mani Square Mall",
      "INOX: South City",
      "Nazrul Mancha",
      "Netaji Indoor Stadium",
    ],
    neighborhoods: ["Park Street", "Ballygunge", "New Town", "Maidan"],
  },
  mumbai: {
    name: "Mumbai",
    venues: [
      "PVR: Phoenix Marketcity",
      "Jio World Convention Centre",
      "NMACC",
      "Wankhede Stadium",
    ],
    neighborhoods: ["BKC", "Andheri", "Lower Parel", "Bandra"],
  },
  "delhi-ncr": {
    name: "Delhi NCR",
    venues: [
      "PVR: Select Citywalk",
      "India Habitat Centre",
      "Jawaharlal Nehru Stadium",
      "Kingdom of Dreams",
    ],
    neighborhoods: ["Saket", "Connaught Place", "Gurugram", "Noida"],
  },
  bengaluru: {
    name: "Bengaluru",
    venues: [
      "PVR: Orion Mall",
      "Phoenix Marketcity",
      "KTPO Convention Centre",
      "Sree Kanteerava Stadium",
    ],
    neighborhoods: ["Whitefield", "Indiranagar", "Koramangala", "Malleshwaram"],
  },
  hyderabad: {
    name: "Hyderabad",
    venues: [
      "PVR: Inorbit Mall",
      "Shilpakala Vedika",
      "HITEX Exhibition Centre",
      "Gachibowli Indoor Stadium",
    ],
    neighborhoods: [
      "Hitech City",
      "Banjara Hills",
      "Jubilee Hills",
      "Gachibowli",
    ],
  },
  chennai: {
    name: "Chennai",
    venues: [
      "PVR: VR Chennai",
      "Phoenix Marketcity",
      "The Music Academy",
      "Jawaharlal Nehru Stadium",
    ],
    neighborhoods: ["Anna Nagar", "T. Nagar", "Adyar", "Nungambakkam"],
  },
  pune: {
    name: "Pune",
    venues: [
      "PVR: Pavilion Mall",
      "Bal Gandharva Rang Mandir",
      "The Mills",
      "MCA International Stadium",
    ],
    neighborhoods: ["Koregaon Park", "Baner", "Shivajinagar", "Viman Nagar"],
  },
  ahmedabad: {
    name: "Ahmedabad",
    venues: [
      "PVR: Acropolis Mall",
      "Natarani Amphitheatre",
      "Tagore Hall",
      "Narendra Modi Stadium",
    ],
    neighborhoods: ["Bodakdev", "Navrangpura", "Thaltej", "Vastrapur"],
  },
  jaipur: {
    name: "Jaipur",
    venues: [
      "PVR: World Trade Park",
      "Jawahar Kala Kendra",
      "SMS Indoor Stadium",
      "Birla Auditorium",
    ],
    neighborhoods: ["Malviya Nagar", "C-Scheme", "Vaishali Nagar", "Bani Park"],
  },
  kochi: {
    name: "Kochi",
    venues: [
      "PVR: Lulu Mall",
      "Durbar Hall Ground",
      "JTPac",
      "Rajiv Gandhi Indoor Stadium",
    ],
    neighborhoods: ["Edappally", "Fort Kochi", "Kakkanad", "Marine Drive"],
  },
};

function toCityId(value?: string | null) {
  return value
    ?.trim()
    .toLocaleLowerCase("en-IN")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function cityNameFromId(cityId: string) {
  const knownCity = cityDetails[cityId]?.name;
  if (knownCity) return knownCity;

  const generatedCityName = cityId
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
  return generatedCityName || "Kolkata";
}

function rotate<T>(items: T[], offset: number) {
  if (!items.length) return items;
  const start = offset % items.length;
  return [...items.slice(start), ...items.slice(0, start)];
}

function citySeed(cityId: string) {
  return [...cityId].reduce(
    (total, character) => total + character.charCodeAt(0),
    0,
  );
}

export function getMockCatalogForCity(cityValue?: string | null) {
  const cityId = toCityId(cityValue) ?? "kolkata";
  const city = cityNameFromId(cityId);
  const cityDetail = cityDetails[cityId];
  const venues = cityDetail?.venues ?? [
    `${city} City Centre`,
    `${city} Arts District`,
    `${city} Convention Centre`,
    `${city} Indoor Arena`,
  ];
  const seed = citySeed(cityId);
  const priceAdjustment = ((seed % 5) - 2) * 10;

  return mockCatalog.map((item, index) => ({
    ...item,
    id: cityId === "kolkata" ? item.id : `${cityId}-${item.id}`,
    city,
    venue: venues[(index + seed) % venues.length],
    priceFrom: Math.max(99, item.priceFrom + priceAdjustment),
    badge:
      cityId === "kolkata" || item.badge ? item.badge : `Popular in ${city}`,
  }));
}

export function getMockHomepageCatalog(
  cityValue?: string | null,
): HomepageCatalog {
  const cityId = toCityId(cityValue) ?? "kolkata";
  const city = cityNameFromId(cityId);
  const seed = citySeed(cityId);
  const allContent = rotate(getMockCatalogForCity(cityId), seed);
  const movies = allContent.filter((item) => item.category === "Movie");
  const events = allContent.filter((item) => item.category !== "Movie");
  const byEventType = (eventType: string) =>
    allContent.filter((item) => item.eventType === eventType);
  const localVenues = rotate(mockVenues, seed).map((venue, index) => {
    const cityDetail = cityDetails[cityId];
    const venueNames = cityDetail?.venues ?? [
      `${city} City Centre`,
      `${city} Arts District`,
      `${city} Convention Centre`,
      `${city} Indoor Arena`,
    ];
    const neighborhoods = cityDetail?.neighborhoods ?? [
      "Central",
      "Downtown",
      "Riverside",
      "City Centre",
    ];
    return {
      ...venue,
      id: cityId === "kolkata" ? venue.id : `${cityId}-${venue.id}`,
      name: venueNames[index % venueNames.length],
      neighborhood: neighborhoods[index % neighborhoods.length],
      city,
      eventCount: Math.max(2, venue.eventCount + ((seed + index) % 5) - 2),
    };
  });

  return {
    city,
    hero: allContent[0] ?? mockCatalog[0],
    trending: allContent.slice(0, 6),
    recommendedMovies: movies,
    liveEvents: events,
    concerts: byEventType("CONCERT"),
    comedy: byEventType("COMEDY"),
    sports: byEventType("SPORT"),
    weekendExperiences: byEventType("ADVENTURE"),
    under499: allContent.filter((item) => item.priceFrom < 500),
    popularVenues: localVenues,
    personalized: rotate(allContent, 3).slice(0, 6),
  };
}

export const mockHomepageCatalog = getMockHomepageCatalog("kolkata");
