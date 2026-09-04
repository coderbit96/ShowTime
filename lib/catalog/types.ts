export type ContentCategory =
  "Movie" | "Live Event" | "Concert" | "Comedy" | "Sports" | "Experience";

export type ContentCard = {
  id: string;
  slug: string;
  title: string;
  category: ContentCategory;
  image: string;
  city: string;
  venue: string;
  dateLabel: string;
  timeLabel: string;
  priceFrom: number;
  rating?: number;
  badge?: string;
  language?: string;
  genre?: string;
  duration?: string;
  eventType?: string;
  startsAt?: string;
  availability?: "AVAILABLE" | "SOLD_OUT";
};

export type EventDetail = {
  id: string;
  slug: string;
  title: string;
  category: ContentCategory;
  eventType: string;
  banner: string;
  poster: string;
  description: string;
  rating?: number;
  dateLabel: string;
  timeLabel: string;
  startDate: string;
  endDate?: string;
  duration: string;
  durationMinutes: number;
  language: string[];
  ageRestriction: string;
  artists: Array<{ name: string; role: string; image?: string }>;
  venue: {
    name: string;
    address: string;
    city: string;
  };
  priceFrom: number;
  organizer: {
    name: string;
    description?: string;
    logo?: string;
  };
  showId?: string;
};

export type MovieShowtime = {
  id: string;
  city: string;
  cinema: string;
  cinemaAddress: string;
  screen: string;
  date: string;
  dateLabel: string;
  time: string;
  priceFrom: number;
  availability: "AVAILABLE" | "SOLD_OUT";
};

export type CinemaChoice = {
  name: string;
  locality: string;
  address: string;
};

export type MovieDetail = {
  id: string;
  slug: string;
  title: string;
  poster: string;
  banner: string;
  description: string;
  language: string[];
  genre: string[];
  cast: Array<{ name: string; role: string; image?: string }>;
  crew: Array<{ name: string; role: string; image?: string }>;
  trailer?: string;
  duration: string;
  durationMinutes: number;
  certificate: string;
  releaseDate: string;
  releaseDateISO: string;
  rating: number;
  showtimes: MovieShowtime[];
  cinemaChoices: CinemaChoice[];
};

export type VenueCard = {
  id: string;
  name: string;
  neighborhood: string;
  city: string;
  image: string;
  eventCount: number;
  specialty: string;
};

export type HomepageCatalog = {
  city: string;
  hero: ContentCard;
  trending: ContentCard[];
  recommendedMovies: ContentCard[];
  liveEvents: ContentCard[];
  concerts: ContentCard[];
  comedy: ContentCard[];
  sports: ContentCard[];
  weekendExperiences: ContentCard[];
  under499: ContentCard[];
  popularVenues: VenueCard[];
  personalized: ContentCard[];
};

export type HomepageCatalogRequest = {
  cityId?: string | null;
};
